import _ from 'lodash';
import logger from '../utils/logger';

export default {
    getAvgAdvertsPerGroup(totalAdverts, groups) {
        const totalAvg =  Math.floor(totalAdverts / groups.length);

        let groupDemand = groups.filter(d => d.total < totalAvg);
        let avg = Math.floor(totalAdverts / groupDemand.length);

        logger.info(`Calculate avg per groups BEGIN (avg=${totalAvg}, adv=${totalAdverts})`, groups.map(g => [g.group, g.total]));

        if(!groupDemand.length) {
            return {};
        }

        while(groupDemand.length > 0 && avg > 0) {
            for(let stat of groupDemand) {
                const toTotalAvg = totalAvg - stat.total;
                const countToAdd = toTotalAvg < avg ? toTotalAvg : avg;

                totalAdverts -= countToAdd;
                stat.total += countToAdd;
                if(!stat.new) {
                    stat.new = 0;
                }
                stat.new += countToAdd;
                logger.info(`Calculate avg per groups STEPS ${stat.group}`, {toTotalAvg, countToAdd, new: stat.new});
            }


            groupDemand = groups.filter(d => {
                logger.info(`Calculate avg per groups CHECKS (${d.total})`, [d.group, d.total]);
                return d.total < totalAvg
            });
            logger.info(`Calculate avg per groups NEW Demand groups (gr=${groupDemand.length})`, groupDemand.map(g => [g.group, g.total]));
            avg = Math.floor(totalAdverts / groupDemand.length);
        }

        logger.info(`Calculate avg per groups ENDED (avg=${totalAvg}, adv=${totalAdverts})`, groups.map(g => [g.group, g.total]));
        return groups;
    },

    assignAdvertsToGroups(adverts, groups) {
        let g = 0, assignments = {};

        for(let advert of adverts) {
            const groupStat = groups[g];

            if(!groupStat || !groupStat.new) {
                break;
            }

            if(!assignments[groupStat.group]) {
                assignments[groupStat.group] = [];
            }

            logger.info(`Create assignments ${groupStat.group} (needed=${groupStat.new}, length=${assignments[groupStat.group].length})`);
            assignments[groupStat.group].push(advert);
            if(assignments[groupStat.group].length >= groupStat.new) {
                g++;
            }
        }

        logger.info(`Create assignments (ass=${Object.keys(assignments).length})`, assignments);
        return assignments;
    },

    assignToGroups(adverts, groupStats, totalStats) {
        logger.info(`Start group assignments (gr=${groupStats.length}, adv=${adverts.length})`);
        const totalAdverts = adverts.length + totalStats.total;

        const updatedStats = this.getAvgAdvertsPerGroup(totalAdverts, groupStats);

        if(_.isEmpty(updatedStats)) {
            return {};
        }

        return this.assignAdvertsToGroups(adverts, updatedStats);
    }
}