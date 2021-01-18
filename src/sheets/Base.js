import logger from "../utils/logger";
import gapiCreds from "../gapi-creds.json";
import {GoogleSpreadsheet} from "google-spreadsheet";

export default class BaseSheet {
    _sheet = null;
    config = null;

    constructor(config) {
        this.config = config;
        this._sheet = new GoogleSpreadsheet(config.id);
    }

    /**
     * 1 get requests to GoogleSheets
     * @returns {Promise<void>}
     */
    async load() {
        try {
            this._sheet.title;
        } catch (e) {
            try {
                await this._sheet.useServiceAccountAuth(gapiCreds);
                await this._sheet.loadInfo(); // 1 req
            } catch (e) {
                logger.error('Error while load sheet - ', e.message, e);
            }
        }
    }

    getWorksheet (worksheetName) {
        if(!worksheetName) {
            throw new Error(`Param 'worksheetName' is required`);
        }

        let worksheet = this.config.worksheets[worksheetName];

        if(!worksheet) {
            throw new Error(`Worksheet config with name '${worksheetName}' doesn't exist`);
        }

        if(typeof worksheet === 'object' && worksheet.id !== undefined) {
            worksheet = worksheet.id;
        }

        if(typeof worksheet === 'string') {
            return this._sheet.sheetsByTitle[worksheet];
        } else if(typeof worksheet === 'number') {
            return this._sheet.sheetsById[worksheet];
        }
    }

    getConfigRange(worksheetName) {
        const worksheetConfig = this.config.worksheets[worksheetName];

        let range = this.config.range;
        if(typeof worksheetConfig === 'object' && worksheetConfig.range) {
            range = worksheetConfig.range;
        }

        return range;
    }

    /**
     * 1 get requests to GoogleSheets
     * @param worksheetName
     * @returns {Promise<*>}
     */
    async loadWorksheet (worksheetName) {
        const worksheet = this.getWorksheet(worksheetName);
        await worksheet.loadCells(this.getConfigRange(worksheetName)); // 1 req

        return worksheet;
    }

    async getCellsInRange(worksheetName, range) {
        const worksheet = this.getWorksheet(worksheetName)
        return worksheet.getCellsInRange(range || this.getConfigRange(worksheetName));
    }

    getCellValue(worksheetName, row, column) {
        const worksheet = this.getWorksheet(worksheetName);
        return worksheet.getCell(row, column).value;
    }

    async getRows(worksheetName, limit, offset = 0) {
        const worksheet = this.getWorksheet(worksheetName);
        return worksheet.getRows({limit, offset});
    }

    async addRows(worksheetName, rows, options) {
        if(!rows.length) {
            return {added: [], worksheet: null, saved: false};
        }

        const worksheet = this.getWorksheet(worksheetName);
        const added = await worksheet.addRows(rows, options);

        return {added, worksheet, saved: true};
    }
}