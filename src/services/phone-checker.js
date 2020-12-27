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

            //logger.info(`Start uniq and format adverts (adv=${adverts.length})`, checkNumbers);

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

            logger.info(`Uniq and format adverts (adv=${adverts.length}, uniq=${uniq.length})`);
            return uniq;
        } catch (e) {
            logger.error(e.message, e);
        }
    },

    async getCheckNumberList() {
        //logger.info(`Start load check number list`);

        await PhoneCheck.load();

        const numberArrays = await PhoneCheck.getCellsInRange(worksheetName);

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