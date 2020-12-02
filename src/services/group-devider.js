import _ from 'lodash';
import logger from '../utils/logger';

export default {
    getAvgAdvertsPerGroup(totalAdverts, totalAvg, groups) {
        let groupDemand = groups.filter(d => d.total < totalAvg);
        let avg = Math.floor(totalAdverts / groupDemand.length);

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

            if(!assignments[groupStat.name]) {
                assignments[groupStat.name] = [];
            }

            assignments[groupStat.name].push(advert);
            if(assignments[groupStat.name].length >= groupStat.new) {
                g++;
            }
        }

        logger.log(Object.keys(assignments).length,`Get assignments (ass=${Object.keys(assignments).length})`, assignments);
        return assignments;
    },

    assignToGroups(adverts, groups, totalStats) {
        const totalAdverts = adverts.length + totalStats.total;
        const totalAvg =  Math.floor(totalAdverts / groups.length);

        logger.info(`Start calculate avg per groups (new-adv=${adverts.length}, all-adv=${totalAdverts}, avg=${totalAvg})`, groups.map(g => [g.name, g.total]));

        const updatedStats = this.getAvgAdvertsPerGroup(totalAdverts, totalAvg, groups);

        if(_.isEmpty(updatedStats)) {
            logger.warning(`Hasn't demand for assignments`);
            return {};
        }

        logger.info(`Calculate avg per groups (adv=${totalAdverts})`, updatedStats.map(g => [g.name, g.total]));

        return this.assignAdvertsToGroups(adverts, updatedStats);
    }
}