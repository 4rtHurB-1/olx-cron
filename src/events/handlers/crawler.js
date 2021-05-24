import _ from "lodash";
import logger from "../../utils/logger";

import AdvertListService from "../../services/adverts-list";
import PhoneCheckerService from "../../services/phone-checker";

export default {
    async onExecute(ads) {
        logger.setLabel('crawler');

        logger.info(`* * * * * Start 'crawler.execute' event * * * * *`);

        try {
            if(!_.isEmpty(ads)) {
                const checkedAdverts = await PhoneCheckerService.getUniqAdverts(ads);
                await AdvertListService.savePreCheckedAdverts(checkedAdverts, ads);
            }
        } catch (e) {
            logger.error(`Error while running 'crawler.execute' event - ${e.message}`, e);
        }

        logger.info(`* * * * * End 'crawler.execute' event * * * * *\n`);
    }
}