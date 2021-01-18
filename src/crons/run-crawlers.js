import logger from '../utils/logger';
import AdvertListService from '../services/adverts-list';
import CrawlerRunnerService from '../services/crawler-runner';

const advertsCntPerRun = 30;

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getCrawlerDemand();
            logger.debugOrWarn(demand, `Crawler demand (cnt=${demand})`, 'run-crawler');

            if(!demand) {
                return;
            }

            await CrawlerRunnerService.runCrawler(advertsCntPerRun);
        } catch (e) {
            logger.error(`Error while running RunCrawler cron - ${e.message}`, 'run-crawler', e);
        }
    }
}