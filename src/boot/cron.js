import cron from 'node-cron';
import logger from '../utils/logger';

import RunCrawler from '../crons/run-crawlers';
import GetGroupStats from '../crons/get-group-stats';
import AssignAdverts from '../crons/assign-adverts';
import PhoneChecks from '../crons/phone-checks';

export default {
    start() {
        const getGroupStatSchedule = '0 * * * *';
        cron.schedule(getGroupStatSchedule, async () => {
            logger.debug(`***** Start GetGroupStats cron (${getGroupStatSchedule})`);
            await GetGroupStats.execute();
            logger.debug(`***** End GetGroupStats cron`);
        });

        const runCrawlerSchedule = '*/2 * * * *';
        cron.schedule(runCrawlerSchedule, async () => {
            logger.debug(`***** Start RunCrawler cron (${runCrawlerSchedule})`);
            await RunCrawler.execute();
            logger.debug(`***** End RunCrawler cron`);
        });

        const phoneChecksSchedule = '*/2 * * * *';
        cron.schedule(phoneChecksSchedule, async () => {
            logger.debug(`***** Start PhoneChecks cron (${phoneChecksSchedule})`);
            await PhoneChecks.execute();
            logger.debug(`***** End PhoneChecks cron`);
        });

        const assignAdvertsSchedule = '*/1 * * * *';
        cron.schedule(assignAdvertsSchedule, async () => {
            logger.debug(`***** Start AssignAdverts cron (${assignAdvertsSchedule})`);
            await AssignAdverts.execute();
            logger.debug(`***** End AssignAdverts cron`);
        });
    }
}