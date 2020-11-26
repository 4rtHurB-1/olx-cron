import { GoogleSpreadsheet } from 'google-spreadsheet';
import gapiCreds from '../gapi-creds.json';
import logger from '../utils/logger';

function defineWorksheet(obj, key, worksheet) {
    Object.defineProperty(obj, key, {
        get: function () {
            if(typeof worksheet === 'object' && worksheet.id !== undefined) {
                worksheet = worksheet.id;
            }

            if(typeof worksheet === 'string') {
                return obj.sheetsByTitle[worksheet];
            } else if(typeof worksheet === 'number') {
                return obj.sheetsById[worksheet];
            }
        }
    });
}

function getRowIdToAppend(worksheet, startPosition) {
    let rowIndex = startPosition.row;
    let prevRowIndex;

    let emptyCells = 0;
    let r = rowIndex;
    let value = worksheet.getCell(startPosition.row, startPosition.column).value;

    while(emptyCells <= 10) {
        if(!value) {
            if(emptyCells === 0) {
                prevRowIndex = rowIndex;
                rowIndex = r;
            }

            emptyCells++;
        }

        if(value && emptyCells !== 0) {
            emptyCells = 0;
            rowIndex = prevRowIndex;
            prevRowIndex = null;
        }

        r++;
        value = worksheet.getCell(r, startPosition.column).value
    }

    return rowIndex;
}

function setObjectToRow(obj, worksheet, rowIndex, columnIndex) {
    let columnId = columnIndex;
    for(let value of Object.values(obj)) {
        worksheet.getCell(rowIndex, columnId).value = value;
        columnId++;
    }
}

export function getSpreadsheet(sheetConfig) {
    const _Sheet = new GoogleSpreadsheet(sheetConfig.id);
    const Sheet = Object.create(_Sheet);

    for(let [key, value] of Object.entries(sheetConfig.worksheets)) {
        defineWorksheet(Sheet, key, value);
    }

    Sheet.getWorksheet = async function(worksheetName) {
        if(!worksheetName) {
            throw new Error(`Param 'worksheetName' is required`);
        }

        let worksheet = sheetConfig.worksheets[worksheetName];

        if(!worksheet) {
            throw new Error(`Worksheet config with name '${worksheetName}' doesn't exist`);
        }

        if(typeof worksheet === 'object' && worksheet.id !== undefined) {
            worksheet = worksheet.id;
        }

        await _Sheet.loadInfo();

        if(typeof worksheet === 'string') {
            return _Sheet.sheetsByTitle[worksheet];
        } else if(typeof worksheet === 'number') {
            return _Sheet.sheetsById[worksheet];
        }
    }

    Sheet.loadWorksheet = async function (worksheetName) {
        const worksheet = await this.getWorksheet(worksheetName);
        const worksheetConfig = sheetConfig.worksheets[worksheetName];

        let range = sheetConfig.range;
        if(typeof worksheetConfig === 'object' && worksheetConfig.range) {
            range = worksheetConfig.range;
        }

        await worksheet.loadCells(range);

        return worksheet;
    }

    Sheet.appendToWorksheet = async function (worksheetName, data, position = {row: 0, column: 0}) {
        const worksheet = await this.loadWorksheet(worksheetName);

        let rowId = getRowIdToAppend(worksheet, position);
        for(let obj of data) {
            if(!worksheet.getCell(rowId, position.column).value) {
                setObjectToRow(obj, worksheet, rowId, position.column);
            }
            rowId++;
        }

        return worksheet;
    }

    Sheet.load = async function () {
        try {
            await _Sheet.useServiceAccountAuth(gapiCreds);
            await _Sheet.loadInfo();
            await this.loadWorksheet('main');
        } catch (e) {
            logger.error(e.message, e);
        }
    }

    return Sheet;
}