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
            //logger.info(`* * * * * Start update-stats cron ${cronSchedules.update_stats}`, 'update-stats');
            await UpdateStats.execute();
            //logger.info(`* * * * * End update-stats cron`, 'update-stats');
        });

        cron.schedule(cronSchedules.run_crawler, async () => {
            logger.info(`* * * * * Start run-crawler cron ${cronSchedules.run_crawler}`, 'run-crawler');
            await RunCrawler.execute();
            logger.info(`* * * * * End run-crawler cron`, 'run-crawler');
        });

        cron.schedule(cronSchedules.phone_checks, async () => {
            logger.setLabel('phone-checks');

            logger.info(`* * * * * Start phone-checks cron ${cronSchedules.phone_checks}`);
            await PhoneChecks.execute();
            logger.info(`* * * * * End phone-checks cron`);
        });

        cron.schedule(cronSchedules.assign_adverts, async () => {
            logger.setLabel('assign-adverts');

            logger.info(`* * * * * Start assign-adverts cron ${cronSchedules.assign_adverts}`);
            await AssignAdverts.execute();
            logger.info(`* * * * * End assign-adverts cron`);
        });
    }
}