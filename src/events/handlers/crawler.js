import _ from "lodash";
import logger from "../../utils/logger";

import AdvertListService from "../../services/adverts-list";
import PhoneCheckerService from "../../services/phone-checker";

export default {
    async onExecute(length) {
        logger.info(`Start 'crawler.execute' event`);

        logger.setLabel('crawler');
        try {
            const adverts = await AdvertListService.getParsedAdverts(length);

            if(_.isEmpty(adverts)) {
                logger.info(`End 'crawler.execute' event`);
                return;
            }

            const checkedAdverts = await PhoneCheckerService.getUniqAdverts(adverts);

            await AdvertListService.savePreCheckedAdverts(checkedAdverts, adverts);
        } catch (e) {
            logger.error(`Error while running 'crawler.execute' event - ${e.message}`, e);
        }

        logger.info(`End 'crawler.execute' event`);
    }
}