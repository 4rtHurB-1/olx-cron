import express from 'express';
import {getConfigValue} from "../utils";
const router = express.Router();

import AdvertList from "../services/adverts-list";

router.get('/tt', (req, res) => {
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

export default router;