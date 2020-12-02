import axios from 'axios';
import moment from 'moment';
import logger from '../utils/logger';
import config from "../config";

import StatRepository from "../repositories/stat";

export default {
    async runCrawler(countAdv) {
        const availableHost = await this.pingCrawlerAPIs();
        if(!availableHost) {
            return false;
        }

        const data = {
            olxUrl: config.category_url,
            max: countAdv,
            collection: config.crawler_api.collection_name
        }

        let res;
        let startAt = moment();
        try {
            logger.info(`Run crawler (max=${countAdv})`, data);

            res = await axios({
                method: 'post',
                url: `${availableHost}/${config.crawler_api.runUrl}`,
                data: data,
                headers: {'Content-Type': 'application/json'}
            });

            logger.info(`Crawler executed (status=${res.status}, adv=${res.data.length - 1})`);
        } catch (e) {
            logger.error(`Crawler failed: ${e.message}`);

        } finally {
            await this.saveStat(res, startAt);
        }
    },

    async pingCrawlerAPIs() {
        try {
            const promises = [];
            for(let host of config.crawler_api.hosts) {
                promises.push(axios.get(host));
            }

            const results = await Promise.all(promises);

            let availableHost = null;
            for(let [index, res] of results.entries()) {
                if(res && res.status === 200) {
                    availableHost = config.crawler_api.hosts[index];
                    break;
                }
            }

            if(!availableHost) {
                logger.warning(`Ping crawler API failed (status!=200)`);
            }

            return availableHost;
        } catch (e) {
            logger.warning(`Ping crawler API failed: ${e.message}`, e);
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

        await StatRepository.saveCrawlerStat(isSuccess, stat);
    }
}