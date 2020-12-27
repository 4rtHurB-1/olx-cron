import axios from 'axios';
import moment from 'moment';
import logger from '../utils/logger';
import {getConfigValues} from "../utils";

import StatsService from "../services/stats";
import Events from '../events';

export default {
    async runCrawler(countAdv) {
        const [olxUrls, crawlerApi] = await getConfigValues(['category_urls', 'crawler_api'])

        const availableHost = await this.pingCrawlerAPIs(crawlerApi.hosts);
        if(!availableHost) {
            return false;
        }

        const data = {
            olxUrl: olxUrls[Math.floor((Math.random() * 100) + 1) % olxUrls.length],
            max: countAdv,
            collection: crawlerApi.collection_name
        }

        let res;
        let startAt = moment();
        try {
            logger.info(`Run crawler (max=${countAdv})`, 'run-crawler', data);

            res = await axios({
                method: 'post',
                url: `${availableHost}/${crawlerApi.run_url}`,
                data: data,
                headers: {'Content-Type': 'application/json'}
            });

            logger.info(`Crawler executed (status=${res.status}, adv=${res.data.length - 1})`, 'run-crawler');
        } catch (e) {
            logger.error(`Crawler failed: ${e.message}`, 'run-crawler', e);
        } finally {
            await this.saveStat(res, startAt);

            Events.emit('crawler.execute', res.data.length - 1);
        }
    },

    async pingCrawlerAPIs(hosts) {
        try {
            const promises = [];
            for(let host of hosts) {
                promises.push(axios.get(host));
            }

            const results = await Promise.all(promises);

            let availableHost = null;
            for(let [index, res] of results.entries()) {
                if(res && res.status === 200) {
                    availableHost = hosts[index];
                    break;
                }
            }

            if(!availableHost) {
                logger.warning(`Ping crawler API failed (status!=200)`, 'run-crawler');
            }

            return availableHost;
        } catch (e) {
            logger.warning(`Ping crawler API failed: ${e.message}`, 'run-crawler', e);
            return false;
        }
    },

    async saveStat(res, startAt) {
        const isSuccess = res && +res.status === 200;

        let stat;
        if(isSuccess) {
            stat = {
                maxAdverts: res.config.data.max,
                adverts: res.data.length - 1,
                timeExecution: moment().diff(startAt, 'milliseconds')
            }
        }

        await StatsService.saveCrawlerStat(isSuccess, stat);
    }
}