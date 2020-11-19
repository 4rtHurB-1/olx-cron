import logger from '../utils/logger';
import AdvertListService from '../services/adverts-list';
import CrawlerRunnerService from '../services/crawler-runner';

export default {
    async execute() {
        const demand = await AdvertListService.getAdvertDemand();

        if(!demand) {
            logger.warning(`RunCrawler cron: There isn't demand`);
            return;
        }

        await CrawlerRunnerService.runCrawler(demand > 30 ? 30 : demand);
    }
}