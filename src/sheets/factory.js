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