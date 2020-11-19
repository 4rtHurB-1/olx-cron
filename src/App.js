import express from 'express';
import bodyParser from 'body-parser';
import logger from './utils/logger';

import helloRoute from './routes/hello';
import DB from "./boot/db";
import dotenv from 'dotenv';
import cron from './boot/cron';
import PC from './crons/phone-checks';

dotenv.load();
const app = express();

DB.connect().then(() => {
  //PC.execute();
  cron.start();
})
app.use(bodyParser.json());
app.use( bodyParser.urlencoded({ extended: true }) );

app.use('/', helloRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT , () => {
  logger.debug('Server (olx-cron) listening on port ' + PORT, {metadata:{port: PORT}});
});

export default app;