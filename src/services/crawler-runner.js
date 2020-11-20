import axios from 'axios';
import logger from '../utils/logger';
import config from "../config";

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

        try {
            logger.info(`Run crawler (max=${countAdv})`, data);
            let res = await axios({
                method: 'post',
                url: `${availableHost}/${config.crawler_api.runUrl}`,
                data: data,
                headers: {'Content-Type': 'application/json'}
            });
            logger.info(`Crawler executed (status=${res.status}, adv=${res.data.length})`);
        } catch (e) {
            logger.error(`Crawler failed: ${e.message}`);
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
    }
}