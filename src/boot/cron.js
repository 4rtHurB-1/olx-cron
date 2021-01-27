import cron from 'node-cron';
import logger from '../utils/logger';
import {getConfigValue} from "../utils";

import RunCrawler from '../crons/run-crawlers';
import UpdateStats from '../crons/update-stats';
import AssignAdverts from '../crons/assign-adverts';
import PhoneChecks from '../crons/phone-checks';

export default {
    async start() {
        const cronSchedules = await getConfigValue('cron_schedules');

        cron.schedule(cronSchedules.update_stats, async () => {
            //logger.info(`* * * * * Start update-stats cron ${cronSchedules.update_stats}`, 'stats');
            await UpdateStats.execute();
            //logger.info(`* * * * * End update-stats cron`, 'stats');
        });

        cron.schedule(cronSchedules.run_crawler, async () => {
            logger.info(`\n* * * * * Start run-crawler cron ${cronSchedules.run_crawler}`, 'crawler');
            await RunCrawler.execute();
            logger.info(`* * * * * End run-crawler cron * * * * *\n`, 'crawler');
        });

        cron.schedule(cronSchedules.phone_checks, async () => {
            logger.setLabel('checks');

            logger.info(`\n* * * * * Start phone-checks cron ${cronSchedules.phone_checks}`);
            await PhoneChecks.execute();
            logger.info(`* * * * * End phone-checks cron * * * * *\n`);
        });

        cron.schedule(cronSchedules.assign_adverts, async () => {
            logger.setLabel('assigns');

            logger.info(`\n* * * * * Start assign-adverts cron ${cronSchedules.assign_adverts}`);
            await AssignAdverts.execute();
            logger.info(`* * * * * End assign-adverts cron * * * * *\n`);
        });
    }
}