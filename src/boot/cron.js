import cron from 'node-cron';
import logger from '../utils/logger';

import RunCrawler from '../crons/run-crawlers';
import GetGroupStats from '../crons/get-group-stats';
import AssignAdverts from '../crons/assign-adverts';
import PhoneChecks from '../crons/phone-checks';
import config from "../config";

export default {
    start() {
        cron.schedule(config.cron_schedules.get_group_stats, async () => {
            logger.setLabel('get-group-stats');

            logger.info(`***** Start get-group-stats cron (${config.cron_schedules.get_group_stats})`);
            await GetGroupStats.execute();
            logger.info(`***** End get-group-stats cron`);
        });

        cron.schedule(config.cron_schedules.run_crawler, async () => {
            logger.setLabel('run-crawler');

            logger.info(`***** Start run-crawler cron (${config.cron_schedules.run_crawler})`);
            await RunCrawler.execute();
            logger.info(`***** End run-crawler cron`);
        });

        cron.schedule(config.cron_schedules.phone_checks, async () => {
            logger.setLabel('phone-checks');

            logger.info(`***** Start phone-checks cron (${config.cron_schedules.phone_checks})`);
            await PhoneChecks.execute();
            logger.info(`***** End phone-checks cron`);
        });

        cron.schedule(config.cron_schedules.assign_adverts, async () => {
            logger.setLabel('assign-adverts');

            logger.info(`***** Start assign-adverts cron (${config.cron_schedules.assign_adverts})`);
            await AssignAdverts.execute();
            logger.info(`***** End assign-adverts cron`);
        });
    }
}