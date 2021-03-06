import logger from '../utils/logger';
import {correctPhoneFormat, detectGenderByName, getConfigValue} from "../utils";

import PhoneCheck from "../sheets/phone-check";

const worksheetName = 'main';

export default {
    async getUniqAdverts(adverts) {
        if (!Array.isArray(adverts)) {
            return [];
        }

        const checkNumbers = await this.getCheckNumberList();

        //logger.info(`Start uniq and format adverts (adv=${adverts.length})`, checkNumbers);

        const uniq = [];
        for (let i = 0; i < adverts.length; i++) {
            let phone = correctPhoneFormat(adverts[i].phone);
            if (phone && !checkNumbers.includes(phone) && !uniq.find(u => u.phone === phone)) {
                uniq.push({
                    phone,
                    url: adverts[i].url,
                    gender: adverts[i].gender || await detectGenderByName(adverts[i].username)
                });
            }
        }

        logger.info(`Uniq and format adverts (adv=${adverts.length}, uniq=${uniq.length})`);
        return uniq;
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