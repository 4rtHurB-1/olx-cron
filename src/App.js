import express from 'express';
import bodyParser from 'body-parser';
import logger from './utils/logger';

import helloRoute from './routes/hello';
import DB from "./boot/db";
import dotenv from 'dotenv';
import cron from './boot/cron';

dotenv.load();
const app = express();

DB.connect().then(() => {
  cron.start();
})
app.use(bodyParser.json());
app.use( bodyParser.urlencoded({ extended: true }) );

app.use('/', helloRoute);

const PORT = process.env.PORT || 3030;
app.listen(PORT , () => {
  logger.info('Server (olx-cron) listening on port ' + PORT, {metadata:{port: PORT}});
});

export default app;