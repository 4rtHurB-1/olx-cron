import logger from "../utils/logger";

import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        try {
            await AdvertListService.deleteOldParsed();
        }  catch (e) {
            logger.error(`Error while running DeleteAdverts cron - ${e.message}`, 'delete', e);
        }
    }
}