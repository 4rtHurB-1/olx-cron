import logger from '../utils/logger';
import config from "../config";

import PhoneCheck from "../sheets/phone-check";
import {correctPhoneFormat, detectGenderByName} from "../utils";
import moment from "moment";

export default {
    async getUniqAdverts(adverts) {
        if(!Array.isArray(adverts)) {
            return [];
        }

        try {
            const checkNumbers = await this.getCheckNumberList();

            logger.info(`Start uniq and format adverts (adv=${adverts.length})`);

            const uniq = [];
            for(let i = 0; i < adverts.length; i++) {
                let phone = correctPhoneFormat(adverts[i].phone);
                if(!checkNumbers.includes(phone) && !uniq.find(u => u.phone === phone)) {
                    uniq.push({
                        phone,
                        url: adverts[i].url,
                        gender: await detectGenderByName(adverts[i].username),
                        checked: true
                    });
                }
            }

            logger.info(`End uniq and format adverts (adv=${uniq.length})`, uniq);
            return uniq;
        } catch (e) {
            logger.error(e.message, e);
        }
    },

    async getCheckNumberList() {
        logger.info(`Start load check number list`);
        await PhoneCheck.load();

        const numberArrays = await PhoneCheck.main.getCellsInRange(config.sheets.phone_check.range);

        const numbers = [];
        let empty = 0;
        for(let i = 0; i < numberArrays.length; i++) {
            if(empty >= 5) {
                break;
            }

            if(Array.isArray(numberArrays[i])) {
                numbers.push(numberArrays[i][0]);
            } else {
                empty++;
            }
        }

        logger.info(`Loaded check number list (num=${numbers.length})`);
        return numbers;
    },

    async appendNumbersToWorksheet(adverts) {
        const position = {row: 1, column: 0};
        const worksheet = 'main';

        const data = [];
        for(let adv of adverts) {
            data.push({
                number: adv.phone,
                date: moment().format('DD.MM.YYYY HH:mm:ss'),
                key: config.check_numbers_save_key
            });
        }

        return PhoneCheck.appendToWorksheet(worksheet, data, position);
    },

    async saveWorksheet(worksheet) {
        await worksheet.saveUpdatedCells({raw: true});
    }
}