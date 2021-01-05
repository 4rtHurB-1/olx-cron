import express from 'express';
import bodyParser from 'body-parser';
import logger from './utils/logger';
import helloRoute from './routes/hello';
import DB from "./boot/db";
import cron from './boot/cron';
import tmp from './crons/assign-adverts';
import tmp1 from './crons/phone-checks';
import tmp2 from './crons/run-crawlers';

const app = express();

DB.connect().then(async () => {
  //tmp2.execute();
  //tmp.execute();
/*  tmp1.execute().then(() => {
    tmp.execute();
  });*/
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