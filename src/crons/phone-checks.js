import _ from 'lodash';
import logger from '../utils/logger';
import PhoneCheckerService from '../services/phone-checker';
import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getAdvertDemand();

            if (!demand) {
                logger.warning(`PhoneChecks cron: There isn't demand`);
                return;
            }

            const adverts = await AdvertListService.getParsedUncheckedAdverts(demand);

            if(_.isEmpty(adverts)) {
                return;
            }

            const checkedAdverts = await PhoneCheckerService.getUniqAdverts(adverts);

            if(_.isEmpty(adverts)) {
                return;
            }

            await AdvertListService.saveCheckedAdverts(checkedAdverts, adverts);
        } catch (e) {
            logger.error(`Error while running PhoneChecks cron: ${e.message}`, e);
        }
    }
}