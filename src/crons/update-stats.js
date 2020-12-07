import moment from 'moment';
import logger from "../utils/logger";

import StatsService from '../services/stats';

export default {
    async execute() {
        try {
            const isNewStat = moment().minutes() === 0;

            const stat = await StatsService.getGroupedActualStat();
            await StatsService.saveStatToWorksheet(stat, isNewStat);

        }  catch (e) {
            logger.error(`Error while running UpdateStats cron: ${e.message}`, 'update-stats', e);
        }
    }
}