import _ from 'lodash';
import logger from '../utils/logger';
import PhoneCheckerService from '../services/phone-checker';
import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        const demand = await AdvertListService.getAdvertDemand();

        if (!demand) {
            logger.warning(`PhoneChecks cron: There isn't demand`);
            return;
        }

        const adverts = await AdvertListService.getParsedUncheckedAdverts(demand);

        if(_.isEmpty(adverts)) {
            logger.warning(`PhoneChecks cron: Not found adverts`);
            return;
        }

        const checkedAdverts = await PhoneCheckerService.getUniqAdverts(adverts);

        if(_.isEmpty(adverts)) {
            logger.warning(`PhoneChecks cron: Not found checked adverts`);
            return;
        }

        await AdvertListService.saveCheckedAdverts(checkedAdverts, adverts);
        await PhoneCheckerService.saveCheckedUniqNumbers(checkedAdverts);
    }
}