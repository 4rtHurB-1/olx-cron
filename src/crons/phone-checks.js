import _ from 'lodash';
import logger from '../utils/logger';
import PhoneCheckerService from '../services/phone-checker';
import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getChecksDemand();
            logger.log(demand, `Checks demand (cnt=${demand})`, 'phone-checks');

            if (!demand) {
                return;
            }

            const adverts = await AdvertListService.getParsedUncheckedAdverts(demand > 50 ? 50: demand);

            if(_.isEmpty(adverts)) {
                return;
            }

            const checkedAdverts = await PhoneCheckerService.getUniqAdverts(adverts);

            await AdvertListService.saveCheckedAdverts(checkedAdverts, adverts);
        } catch (e) {
            logger.error(`Error while running PhoneChecks cron: ${e.message}`, 'phone-checks', e);
        }
    }
}