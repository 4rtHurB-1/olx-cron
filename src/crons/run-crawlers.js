import logger from '../utils/logger';
import AdvertListService from '../services/adverts-list';
import CrawlerRunnerService from '../services/crawler-runner';

const advertsCntPerRun = 40;

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getCrawlerDemand();
            logger.debugOrWarn(demand, `Crawler demand (cnt=${demand})`, 'crawler');

            if(!demand) {
                return;
            }

            await CrawlerRunnerService.runCrawler(advertsCntPerRun);
        } catch (e) {
            logger.error(`Error while running RunCrawler cron - ${e.message}`, 'crawler', e);
        }
    }
}