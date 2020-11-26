import _ from 'lodash';
import logger from '../utils/logger';

export default {
    getAvgAdvertsPerGroup(totalAdverts, groups) {
        const totalAvg =  Math.floor(totalAdverts / groups.length);

        let groupDemand = groups.filter(d => d.total < totalAvg);
        let avg = Math.floor(totalAdverts / groupDemand.length);

        logger.info(`Start calculate avg per groups (avg=${totalAvg}, adv=${totalAdverts})`, groups.map(g => [g.group, g.total]));

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
            }


            groupDemand = groups.filter(d => {
                return d.total < totalAvg
            });
            avg = Math.floor(totalAdverts / groupDemand.length);
        }

        return groups;
    },

    assignAdvertsToGroups(adverts, groups) {
        let g = 0, assignments = {};

        for(let advert of adverts) {
            const groupStat = groups[g];

            if(!groupStat) {
                break;
            }

            if(!groupStat.new) {
                g++;
                continue;
            }

            if(!assignments[groupStat.group]) {
                assignments[groupStat.group] = [];
            }

            assignments[groupStat.group].push(advert);
            if(assignments[groupStat.group].length >= groupStat.new) {
                g++;
            }
        }

        logger.info(`Get assignments (ass=${Object.keys(assignments).length})`, assignments);
        return assignments;
    },

    assignToGroups(adverts, groupStats, totalStats) {
        logger.info(`Start group assignments (gr=${groupStats.length}, adv=${adverts.length})`);
        const totalAdverts = adverts.length + totalStats.total;

        const updatedStats = this.getAvgAdvertsPerGroup(totalAdverts, groupStats);
        logger.info(`Calculate avg per groups (adv=${totalAdverts})`, updatedStats.map(g => [g.group, g.total]));

        if(_.isEmpty(updatedStats)) {
            logger.warning(`Hasn't stats for assignments`);
            return {};
        }

        return this.assignAdvertsToGroups(adverts, updatedStats);
    }
}