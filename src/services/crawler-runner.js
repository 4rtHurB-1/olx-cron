import axios from 'axios';
import logger from '../utils/logger';
import config from "../config";

export default {
    async runCrawler(countAdv) {
        if(!await this.pingCrawlerAPI()) {
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
                url: `${config.crawler_api.host}/${config.crawler_api.runUrl}`,
                data: data,
                headers: {'Content-Type': 'application/json'}
            });
            logger.info(`Crawler executed (status=${res.status}, res====)`, res);
        } catch (e) {
            logger.error(`Crawler failed: ${e.message}`);
        }
    },

    async pingCrawlerAPI() {
        try {
            let res = await axios.get(config.crawler_api.host);

            if(!res || res.status !== 200) {
                logger.warning(`Ping crawler API failed (status!=200)`, res);
            }

            return res && res.status === 200;
        } catch (e) {
            logger.warning(`Ping crawler API failed: ${e.message}`, e);
            return false;
        }
    }
}