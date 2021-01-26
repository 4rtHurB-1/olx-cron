import express from 'express';
import axios from "axios";
import {getConfigValue} from "../utils";

import AdvertList from "../services/adverts-list";

const router = express.Router();
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Safari/537.36';

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
            let result = await axios({
                method: 'GET',
                url: req.query.url,
                headers: {'User-Agent': USER_AGENT}
            });
            res.status(result.status).send(result.data);
        } catch (e) {
            console.log(e.message);
        }
    }
})

export default router;