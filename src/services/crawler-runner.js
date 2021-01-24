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

        let res = {};
        let startAt = moment();
        try {
            logger.info(`Run crawler (max=${countAdv}, host=${availableHost})`, 'run-crawler');

            res = await axios({
                method: 'post',
                url: `${availableHost}/${crawlerApi.run_url}`,
                data: data,
                headers: {'Content-Type': 'application/json'}
            });

            if(!this._isStatus200(res)) {
                throw new Error(`Crawler run failed (status=${res ? res.status : 'not defined'})`)
            }

            logger.debug(`Crawler executed (adv=${res.data.length - 1}, max=${countAdv})`, 'run-crawler', data);
        } catch (e) {
            logger.error(`Error while crawler execute - ${e.message}`, 'run-crawler', e);
        } finally {
            await this.saveStat(res, startAt);

            if(this._isStatus200(res)) {
                Events.emit('crawler.execute', res.data.length - 1);
            }
        }
    },

    async pingCrawlerAPIs(hosts) {
        try {
            const promises = [];
            for(let host of hosts) {
                promises.push(axios.get(host,{timeout: 3}).catch(e => {
                    //logger.warning(`Ping crawler API host ${host} failed: ${e.message}`, 'run-crawler', e);
                }));
            }

            const results = await Promise.all(promises);

            let availableHost = null;
            for(let [index, res] of results.entries()) {
                if(this._isStatus200(res)) {
                    availableHost = hosts[index];
                    break;
                }
            }

            if(!availableHost) {
                logger.warning(`Ping crawler API failed (status!=200)`, 'run-crawler');
            }

            return availableHost;
        } catch (e) {
            logger.error(`Ping crawler API failed (error: ${e.message})`, 'run-crawler', e);
            return false;
        }
    },

    async saveStat(res, startAt) {
        const isSuccess = this._isStatus200(res);

        let stat;
        if(isSuccess) {
            stat = {
                maxAdverts: res.config.data.max,
                adverts: res.data.length - 1,
                timeExecution: moment().diff(startAt, 'milliseconds')
            }
        }

        await StatsService.saveCrawlerStat(isSuccess, stat);
    },

    _isStatus200(res) {
        return res && res.status === 200;
    }
}