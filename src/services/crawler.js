import fs from "fs";
import path from "path";
import _ from 'lodash';
import axios from "axios";

const EventEmitter = require('events').EventEmitter;
import {CollectContent, OpenLinks, Root, Scraper} from 'nodejs-web-scraper';

import {delay, getRandomInt} from "../utils";
import logger from "../utils/logger";

export default class Crawler {
    constructor(config) {
        this.parsed = [];
        this.config = config;
        this.olx = new OLX(config.olx);
        this.pubsub = new EventEmitter();
        this.PARSED_FIELDS = ['userName', 'id'];
    }

    onPageCrawled(fn) {
        this.onPageCrawledFn = fn;
        return this;
    }

    onPhoneCrawled(fn) {
        this.onPhoneCrawledFn = fn;
        return this;
    }

    onStart(fn) {
        this.pubsub.on('crawler.start', fn);
        return this;
    }

    onComplete(fn) {
        this.pubsub.on('crawler.complete', fn);
        return this;
    }

    getNextUrl() {
        if(_.isArray(this.config.url)) {
            logger.debug(`Next url old=${this.config.url.length}`);
            let url = this.config.url[getRandomInt(this.config.url.length) - 1];
            this.config.url = _.remove(this.config.url, i => i === url);

            logger.debug(`Next url new=${this.config.url.length} url=${url}`);

            return url;
        }

        return this.config.url;
    }

    getNextPages(pages) {
        if(!pages) {
            return {
                from: 1,
                to: 1,
            };
        }

        logger.debug(`Next page from=${pages.from + 1}`);
        return {
            from: pages.from + 1,
            to: pages.to + 1,
        };
    }

    async run(crawlerConfig) {
        try {
            if(_.isEmpty(crawlerConfig)) {
                return null;
            }

            if (!crawlerConfig.url && !crawlerConfig.pages) {
                this.pubsub.emit('crawler.start', crawlerConfig);

                crawlerConfig = {
                    ...crawlerConfig,
                    url: this.getNextUrl(),
                    pages: this.getNextPages(),
                }
            }

            if (this.parsed.length >= crawlerConfig.count || !crawlerConfig.url) {
                this.pubsub.emit('crawler.complete', this.parsed);
                return;
            }

            if(crawlerConfig.pages.to >= 20) {
                crawlerConfig = {
                    ...crawlerConfig,
                    pages: this.getNextPages(),
                    url: this.getNextUrl(),
                }
            }

            let parsedAds = await this.runScrapper(crawlerConfig);
            try {
                parsedAds = await this.onPageCrawledFn(parsedAds);
            } catch (e) {
                logger.error(`Error while run 'onPageCrawledFn' - ${e.message}`, 'crawler', e);
            }

            if(parsedAds.length > crawlerConfig.count) {
                parsedAds = parsedAds.slice(0, crawlerConfig.count);
            }

            for(let adv of parsedAds) {
                adv.phones = await this.olx.getAdvPhones(adv);
                await delay(5000);
            }

            try {
                parsedAds = await this.onPhoneCrawledFn(parsedAds);
            } catch (e) {
                logger.error(`Error while run 'onPhoneCrawledFn' - ${e.message}`, 'crawler', e);
            }

            this.parsed = this.parsed.concat(parsedAds);
            logger.debug(`Next run parsed=${this.parsed.length}`);

            return this.run({
                ...crawlerConfig,
                pages: this.getNextPages(crawlerConfig.pages),
            });
        } catch (e) {
            logger.error(`Error while crawler run - ${e.message}`, 'crawler', e);
        }
    }

    async runScrapper(crawlerConfig) {
        this._scrapped = [];

        if(!this._advLinksScraperPart) {
            this._buildAdvLinksScraperPart(crawlerConfig);
        }

        await this._buildScraper(crawlerConfig).scrape(
            this._buildRootScraperPart(crawlerConfig)
        );

        return this._scrapped;
    }

    _onItemScrap(parsedAdv, url) {
        const adv = { url };

        for(let fieldName of this.PARSED_FIELDS) {
            adv[fieldName] = _.isArray(parsedAdv[fieldName])
                ? parsedAdv[fieldName][0]
                : parsedAdv[fieldName];
        }

        this._scrapped.push(adv);
    }

    _buildAdvLinksScraperPart() {
        const advLinks = new OpenLinks('.title-cell .detailsLink', {
            name: 'adv-links',
            getPageObject: this._onItemScrap.bind(this)
        });

        //const usrAdvLinks = new OpenLinks('a[name=user_ads]', { name: 'Usr ad list', getUsrList });

        const userName = new CollectContent(`a[name=user_ads] > div:contains("на OLX з") h2`, {
            name: 'userName',
            contentType: 'text'
        });
        // const userAdsUrl = new CollectContent(`a[name=user_ads]`, {
        //     name: 'userAdsUrl',
        //     contentType: 'text'
        // });

        const advId = new CollectContent(`span:contains('ID:')`, {
            name: 'id',
            contentType: 'text',
            getElementContent: async (content) => {
                content = _.isArray(content) ? content[0] : content;
                if(!_.isEmpty(content)) {
                    return content.replace(/[^\d]/g, '');
                }

                return content;
            },
        });

        advLinks.addOperation(userName);
        advLinks.addOperation(advId);

        // root.addOperation(usrAdsList);
        // usrAdsList.addOperation(userAdsUrl);
        this._advLinksScraperPart = advLinks;
    }

    _buildScraper(crawlerConfig) {
        const config = {
            baseSiteUrl: `https://www.this.config.ua/`,
            startUrl: crawlerConfig.url,
            logPath: './scrapper-logs/',
            showConsoleLogs: false
        }

        return new Scraper(config);
    }

    _buildRootScraperPart(crawlerConfig) {
        const root = new Root({
            pagination: {
                queryString: 'page',
                begin: crawlerConfig.pages.from,
                end: crawlerConfig.pages.to,
            },
        });

        root.addOperation(this._advLinksScraperPart);

        return root;
    }
}

class OLX {
    constructor(config) {
        this.OLX_TOKENS_FILENAME = 'olx_tokens.oauth';
        this.config = config;

        this.init();
    }

    async init() {
        this.tokens = await this.getOAuthTokens();
    }

    saveOAuthTokensToFile(tokens, filename) {
        try {
            fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(tokens));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    getOAuthTokensFromFile(filename) {
        try {
            return fs.readFileSync(path.join(__dirname, filename), 'utf8');
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async getOAuthTokens() {
        let tokens = this.getOAuthTokensFromFile(this.OLX_TOKENS_FILENAME);
        if(_.isEmpty(tokens)) {
            tokens = await this.getOAuthTokensFromDevice();

            if(!_.isEmpty(tokens)) {
                this.saveOAuthTokensToFile(tokens, this.OLX_TOKENS_FILENAME);
            }
        }

        return tokens;
    }

    async getOAuthTokensFromDevice() {
        const res = await axios({
            method: 'post',
            url: this.config.routes.oauth,
            data: {
                client_id: this.config.client_id,
                client_secret: this.config.client_secret,
                device_id: this.config.device_id,
                device_token: this.config.device_token,
                grant_type: 'device',
                scope: 'i2 read write v2',
            },
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': this.config.user_agent,
            }
        });

        if(_.isEmpty(res.data)) {
            return null;
        }

        return {
            access_token:  res.data.access_token,
            refresh_token: res.data.refresh_token,
        };
    }

    async getAdvPhones(adv) {
        logger.debug(`OLX Req - ${this.config.routes.adv_phones.replace('$offerId', adv.id)}`);

        const res = await axios({
            method: 'get',
            url: this.config.routes.adv_phones.replace('$offerId', adv.id),
            headers: {
                'User-Agent': this.config.user_agent,
                'Authorization': `Bearer ${this.tokens.access_token}`,
            }
        });

        if(_.isEmpty(res.data) || _.isEmpty(res.data.data)) {
            return null;
        }

        return res.data.data.phones;
    }
}