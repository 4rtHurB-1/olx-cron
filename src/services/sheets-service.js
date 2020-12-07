import logger from "../utils/logger";
import moment from "moment";
import {getConfigValue} from "../utils";

import PhoneCheck from "../sheets/phone-check";
import PhoneList from "../sheets/phone-list";

export default {
    async loadSheet(sheet, worksheet) {
        await sheet.load();
        if(worksheet) {
            await sheet.loadWorksheet(worksheet);
        }
    },

    getCellValue(sheet, worksheetName, row, column) {
        return sheet[worksheetName].getCell(row, column).value;
    },

    async getCellsInRange(sheet, worksheetName, range) {
        await sheet.load();
        const worksheet = await sheet.getWorksheet(worksheetName)
        return worksheet.getCellsInRange(range);
    },

    async getRows(sheet, worksheetName, limit, offset = 0) {
        await sheet.load();
        const worksheet = await sheet.getWorksheet(worksheetName);
        return worksheet.getRows({limit, offset});
    },

    async addRows(sheet, worksheetName, rows, options = {raw: true}) {
        await sheet.load();
        const worksheet = await sheet.getWorksheet(worksheetName);
        return worksheet.addRows(rows, options);
    },

    async deleteRows(rows) {
        for(let row of rows.reverse()) {
            await row.delete();
            logger.info(`Delete row ${row.rowNumber}`);
        }
    },

    async saveNumbersToWorksheet(adverts) {
        const worksheetName = 'main';

        const key = getConfigValue('check_numbers_save_key', false);
        const date = moment().format('DD.MM.YYYY HH:mm:ss');

        const data = [];
        for (let adv of adverts) {
            data.push([
                adv.phone,
                date,
                key,
            ]);
        }

        return this.addRows(PhoneCheck, worksheetName, data);
    },

    undoSaveNumbersToWorksheet(rows) {
        return this.deleteRows(rows);
    },

    async appendAdvertsToWorksheet(adverts, worksheetName) {
        const position = {row: 1, column: 0};

        const now = moment().format('DD.MM.YYYY HH:mm');
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
    },

    async undoSaveAdvertsToWorksheet(sheet, worksheetName, data) {
        const worksheet = await sheet.loadWorksheet(worksheetName);

        for (let d of data) {
            if (worksheet.getCell(d.row, d.column).value == d.values[0]) {
                this._emptyRow(worksheet, d.row, d.column, d.values.length);
            }
        }

        await this.saveWorksheet(worksheet);
        return worksheet;
    },

    async saveWorksheet(worksheet) {
        await worksheet.saveUpdatedCells({raw: true});
    },

    async _appendToWorksheet(sheet, worksheetName, data, position = {row: 0, column: 0}) {
        const worksheet = await sheet.loadWorksheet(worksheetName);

        const added = [];
        let rowId = this._getRowIdToAppend(worksheet, position);

        for (let obj of data) {
            if (!worksheet.getCell(rowId, position.column).value) {
                added.push(this._setObjectToRow(obj, worksheet, rowId, position.column));
            }
            rowId++;
        }

        return {added, worksheet};
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