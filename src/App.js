import express from 'express';
import bodyParser from 'body-parser';
import logger from './utils/logger';
import helloRoute from './routes/hello';
import DB from "./boot/db";
import cron from './boot/cron';

const app = express();

DB.connect().then(async () => {
  cron.start();
})
app.use(bodyParser.json());
app.use( bodyParser.urlencoded({ extended: true }) );

app.use('/', helloRoute);

const PORT = process.env.PORT || 3030;
app.listen(PORT , () => {
  if(process.env.ENV) {
    logger.info(`${process.env.ENV.toUpperCase()} environment enabled`);
  }

  logger.debug(`Start olx-cron (port=${PORT})`);
});

export default app;