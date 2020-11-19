import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    res.send(200, 'Hello Natali :)');
});

export default router;