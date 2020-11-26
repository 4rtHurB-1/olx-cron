import AdvertListService from '../services/adverts-list';
import logger from "../utils/logger";

export default {
    async execute() {
        try {
            await AdvertListService.getGroupStats();
        }  catch (e) {
            logger.error(`Error while running GetGroupStats cron: ${e.message}`, e);
        }
    }
}