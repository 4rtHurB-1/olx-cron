import express from 'express';
import request from 'request';

import {getConfigValue} from "../utils";
const router = express.Router();

import AdvertList from "../services/adverts-list";

router.get('/', (req, res) => {
    res.send(200, 'It works :)');
});

router.get('/webhooks/expire-adverts', async (req, res) => {
    if(!req.query.token || req.query.token !== getConfigValue('api_token', false)) {
        res.status(404).json({error: 'No access'});
    } else if(!req.query.urls) {
        res.status(400).json({error: `Param 'urls' is required`});
    } else {
        const saved = await AdvertList.saveExpiredAdverts(req.query.urls.split(','));
        res.status(200).send({saved});
    }
});

router.get('/req-to-olx', async (req, res) => {
    if(!req.query.token || req.query.token !== getConfigValue('api_token', false)) {
        res.status(404).json({error: 'No access'});
    } else if(!req.query.url) {
        res.status(400).json({error: `Param 'url' is required`});
    } else {
        let options = {
            method: 'GET',
            url: req.query.url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Safari/537.36'
            }
        };

        request(options, function (error, response, body) {
            if (!error) {
                console.log(body);
                res.status(200).send(body);
            } else {
                console.log(error);
            }
        });
    }
})

export default router;