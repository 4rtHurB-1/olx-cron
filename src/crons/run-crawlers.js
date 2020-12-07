import logger from '../utils/logger';
import AdvertListService from '../services/adverts-list';
import CrawlerRunnerService from '../services/crawler-runner';

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getAdvertDemand();

            if(!demand) {
                logger.warning(`RunCrawler cron: There isn't demand`, 'run-crawler');
                return;
            }

            await CrawlerRunnerService.runCrawler(demand > 30 ? 30 : demand);
        } catch (e) {
            logger.error(`Error while running RunCrawler cron: ${e.message}`, 'run-crawler', e);
        }
    }
}