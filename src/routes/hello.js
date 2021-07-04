import express from 'express';
import _ from 'lodash';
import {getConfigValue} from "../utils";

import ConfigRepository from '../repositories/config';
import AdvertList from "../services/adverts-list";
const { Scraper, Root, CollectContent } = require('nodejs-web-scraper');

const router = express.Router();

router.get('/', (req, res) => {
    res.send(200, 'It works :)');
});

router.get('/webhooks/expire-adverts', async (req, res) => {
    if(!req.query.token || req.query.token !== await getConfigValue('api.token')) {
        res.status(401).json({error: 'No access'});
    } else if(!req.query.urls) {
        res.status(400).json({error: `Param 'urls' is required`});
    } else {
        const saved = await AdvertList.saveExpiredAdverts(req.query.urls.split(','));
        res.status(200).send({saved});
    }
});

router.get('/req-to-olx', async (req, res) => {
    if(!req.query.token || req.query.token !== await getConfigValue('api.token')) {
        res.status(401).json({error: 'No access'});
    } else if(!req.query.url) {
        res.status(400).json({error: `Param 'url' is required`});
    } else {
        try {
            const scraper = new Scraper({
                baseSiteUrl: `https://www.olx.ua/`,
                startUrl: req.query.url,
                logPath: './logs/'
            });

            const root = new Root();
            const isActive = new CollectContent('div[data-testid=chat-wrapper]', { name: 'isActive' });
            root.addOperation(isActive);
            await scraper.scrape(root);


            res.status(result.status).send(isActive.getData());
        } catch (e) {
            console.log(e.message);
        }
    }
})

router.patch('/configs/:key', async (req, res) => {
    if(!req.query.token || req.query.token !== await getConfigValue('api.token')) {
        res.status(401).json({error: 'No access'});
    } else if(!req.params.key) {
        res.status(400).json({error: `Param 'key' is required`});
    } else {
        try {
            await ConfigRepository.updateByKey(req.params.key, req.body);
            res.status(200).send({
                key: req.params.key,
                value: req.body
            });
        } catch (e) {
            res.status(400).send({
                error: e.message
            });
            console.log(e.message);
        }
    }
})

router.get('/configs/:key', async (req, res) => {
    if(!req.query.token || req.query.token !== await getConfigValue('api.token')) {
        res.status(401).json({error: 'No access'});
    } else if(!req.params.key) {
        res.status(400).json({error: `Param 'key' is required`});
    } else {
        try {
            const config = await ConfigRepository.getByKey(req.params.key);

            const result = {};
            if(!_.isEmpty(config)) {
                result.key = config.key;
                result.value = config.value;
            }

            res.status(200).send(result);
        } catch (e) {
            res.status(400).send({
                error: e.message
            });
            console.log(e.message);
        }
    }
})


export default router;