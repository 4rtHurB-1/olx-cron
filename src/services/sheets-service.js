import _ from 'lodash';
import logger from "../utils/logger";
import moment from "moment-timezone";
import {getConfigValue, getConfigValues} from "../utils";

import PhoneCheck from "../sheets/phone-check";
import PhoneList from "../sheets/phone-list";

export default {
    async deleteRows(worksheet, rows) {
        // Simplify deleting rows
        /*for(let row of rows.reverse()) {
            await row.delete();
            logger.info(`Delete row ${row.rowNumber}`);
        }*/

        logger.debug(`Deleting rows ${worksheet.rowCount - rows.length + 1}-${worksheet.rowCount}`);

        await worksheet.resize({ rowCount: worksheet.rowCount - rows.length, columnCount: worksheet.columnCount });
    },

    async saveAdvertsToWorksheet(adverts, worksheetName) {
        const [LIST_ADVERTS_SAVE_V, timeZone] = await getConfigValues(['list_adverts_save.ver', 'stat.time_zone']);

        const now = moment().tz(timeZone).format('DD.MM.YYYY HH:mm');
        if(LIST_ADVERTS_SAVE_V === 'v1') {
            const data = [];
            for (let adv of adverts) {
                data.push([
                    now,
                    adv.gender,
                    `'${adv.phone}`,
                    adv.url
                ]);
            }

            return PhoneList.addRows(worksheetName, data, {raw: false});
        } else if(LIST_ADVERTS_SAVE_V === 'v2') {
            const position = {row: 1, column: 0};

            const data = [];
            for (let adv of adverts) {
                data.push({
                    date: now,
                    gender: adv.gender,
                    phone: adv.phone,
                    key: adv.url
                });
            }

            return this._appendToWorksheet(PhoneList, worksheetName, data, position);
        }
    },

    async undoSaveAdvertsToWorksheet(sheet, worksheetName, saveRes) {
        const LIST_ADVERTS_SAVE_V = await getConfigValue('list_adverts_save.ver');

        if(LIST_ADVERTS_SAVE_V === 'v1') {
            return this.deleteRows(saveRes.worksheet, saveRes.added);
        } else if(LIST_ADVERTS_SAVE_V === 'v2') {
            return this.undoAppendAndSaveToWorksheet(sheet, worksheetName, saveRes.added);
        }
    },

    async saveNumbersToWorksheet(adverts) {
        const [CHECK_NUMBER_SAVE_V, timeZone] = await getConfigValues(['check_number_save.ver', 'stat.time_zone']);

        if(CHECK_NUMBER_SAVE_V === 'v1') {
            const worksheetName = 'main';
            const key = getConfigValue('check_number_save.key', false);
            const date = moment().tz(timeZone).format('DD.MM.YYYY HH:mm:ss');

            const data = [];
            for (let adv of adverts) {
                data.push([
                    `'${adv.phone}`,
                    date,
                    key,
                ]);
            }

            const res = await PhoneCheck.addRows(worksheetName, data, {raw: false});

            if(res.added.length) {
                await this.applyFormatForNumbers(PhoneCheck.getWorksheet(worksheetName), {
                    start:  res.added[0].rowNumber - 1,
                    end: res.added[res.added.length - 1].rowNumber - 1
                });
            }

            return res;
        } else if(CHECK_NUMBER_SAVE_V === 'v2') {
            const worksheetName = 'new';

            const data = [];
            for (let adv of adverts) {
                data.push({phone: adv.phone});
            }

            return this.appendAndSaveToWorksheet(
                PhoneCheck, worksheetName, data, {row: 2, column: 4}
            );
        }
    },

    async undoSaveNumbersToWorksheet(saveRes) {
        const CHECK_NUMBER_SAVE_V = await getConfigValue('check_number_save.ver');

        if(CHECK_NUMBER_SAVE_V === 'v1') {
            return this.deleteRows(saveRes.worksheet, saveRes.added);
        } else if(CHECK_NUMBER_SAVE_V === 'v2') {
            return this.undoAppendAndSaveToWorksheet(PhoneCheck, 'new', saveRes.added);
        }
    },

    async saveWorksheet(worksheet) {
        await worksheet.saveUpdatedCells();
    },

    async appendAndSaveToWorksheet(sheet, worksheetName, data, position) {
        const res = await this._appendToWorksheet(sheet, worksheetName, data, position);

        await this.saveWorksheet(res.worksheet);
        res.saved = true;

        return res;
    },

    async undoAppendAndSaveToWorksheet(sheet, worksheetName, data) {
        const worksheet = await sheet.loadWorksheet(worksheetName); // 2 req

        for (let d of data) {
            if (worksheet.getCell(d.row, d.column).value == d.values[0]) {
                this._emptyRow(worksheet, d.row, d.column, d.values.length);
            }
        }

        await this.saveWorksheet(worksheet);
        return worksheet;
    },

    async applyFormatForNumbers(worksheet, row) {
        let range = getConfigValue('sheets.phone_check.format_range', false).split(':');
        range = `${range[0]}${row.start + 1}:${range[1]}${row.end + 1}`;

        await worksheet.loadCells(range);

        const borderStyle = {
            top: {style: 'SOLID'},
            bottom: {style: 'SOLID'},
            left: {style: 'SOLID'},
            right: {style: 'SOLID'}
        };

        for(let r = row.start; r <= row.end; r++) {
            for(let c = 0; c <= 2; c++) {
                const cell = worksheet.getCell(r, c);

                cell.numberFormat = c === 1
                    ? {type: 'DATE' , pattern: 'dd mmmm yyy р.'}
                    : {type: 'TEXT'};
                cell.borders = borderStyle;
            }
        }

        await this.saveWorksheet(worksheet);
    },

    async _appendToWorksheet(sheet, worksheetName, data, position = {row: 0, column: 0}) {
        const worksheet = await sheet.loadWorksheet(worksheetName); // 2 req

        const added = [];
        let rowId = this._getRowIdToAppend(worksheet, position);

        for (let obj of data) {
            if (!worksheet.getCell(rowId, position.column).value) {
                added.push(this._setObjectToRow(obj, worksheet, rowId, position.column));
            }
            rowId++;
        }

        return {added, worksheet, saved: false};
    },

    _setObjectToRow(obj, worksheet, rowIndex, columnIndex) {
        let columnId = columnIndex;
        const values = Object.values(obj);
        for (let value of values) {
            worksheet.getCell(rowIndex, columnId).value = value;
            columnId++;
        }

        return {row: rowIndex, column: columnIndex, values};
    },

    _emptyRow(worksheet, rowIndex, columnIndex, emptyLength) {
        let columnId = columnIndex;
        for (let i = 0; i < emptyLength; i++) {
            worksheet.getCell(rowIndex, columnId).value = null;
            columnId++;
        }
    },

    _getRowIdToAppend(worksheet, startPosition) {
        let rowIndex = startPosition.row;
        let prevRowIndex;

        let emptyCells = 0;
        let r = rowIndex;
        let value = worksheet.getCell(startPosition.row, startPosition.column).value;

        while (emptyCells <= 10) {
            if (!value) {
                if (emptyCells === 0) {
                    prevRowIndex = rowIndex;
                    rowIndex = r;
                }

                emptyCells++;
            }

            if (value && emptyCells !== 0) {
                emptyCells = 0;
                rowIndex = prevRowIndex;
                prevRowIndex = null;
            }

            r++;
            value = worksheet.getCell(r, startPosition.column).value
        }

        return rowIndex;
    }
}