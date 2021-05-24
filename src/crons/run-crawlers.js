import logger from '../utils/logger';
import AdvertListService from '../services/adverts-list';
import Crawler from '../services/crawler';
import {getConfigValues} from "../utils";

import events from '../events';

const advertsCntPerRun = 40;

export default {
    async execute() {
        const demand = await AdvertListService.getCrawlerDemand();
        logger.debugOrWarn(demand, `Crawler demand (cnt=${demand})`, 'crawler');

        if(!demand) {
            return;
        }

        const [olxUrls, olx] = await getConfigValues(['category_urls', 'olx']);
        try {
            const config = {
                url: olxUrls,
                olx,
            };

            new Crawler(config)
                .onStart(() => {
                    console.log('Crawler starts');
                })
                .onPageCrawled(
                    ads => AdvertListService.getNotSavedToDb(ads)
                )
                .onPhoneCrawled(
                    ads => AdvertListService.saveToDb(ads)
                )
                .onComplete(
                    ads => events.emit('crawler.execute', ads)
                )
                .run({
                    count: advertsCntPerRun
                });
        } catch (e) {
            logger.error(`Error while crawler execute - ${e.message}`, 'crawler', e);
        }
    },
}