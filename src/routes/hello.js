import express from 'express';
import axios from "axios";
import {getConfigValue} from "../utils";

import AdvertList from "../services/adverts-list";
const { Scraper, Root, DownloadContent, OpenLinks, CollectContent } = require('nodejs-web-scraper');

const router = express.Router();
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';

router.get('/', (req, res) => {
    res.send(200, 'It works :)');
});

router.get('/webhooks/expire-adverts', async (req, res) => {
    if(!req.query.token || req.query.token !== await getConfigValue('api.token')) {
        res.status(404).json({error: 'No access'});
    } else if(!req.query.urls) {
        res.status(400).json({error: `Param 'urls' is required`});
    } else {
        const saved = await AdvertList.saveExpiredAdverts(req.query.urls.split(','));
        res.status(200).send({saved});
    }
});

router.get('/req-to-olx', async (req, res) => {
    if(!req.query.token || req.query.token !== await getConfigValue('api.token')) {
        res.status(404).json({error: 'No access'});
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

export default router;