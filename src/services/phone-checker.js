import logger from '../utils/logger';
import {correctPhoneFormat, detectGenderByName, getConfigValue} from "../utils";

import PhoneCheck from "../sheets/phone-check";
import SheetsService from "../services/sheets-service";

const worksheetName = 'main';

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
                if(phone && !checkNumbers.includes(phone) && !uniq.find(u => u.phone === phone)) {
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
        const range = getConfigValue('sheets.phone_check.phone_range', false);
        const numberArrays = await SheetsService.getCellsInRange(PhoneCheck, worksheetName, range);

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
    }
}