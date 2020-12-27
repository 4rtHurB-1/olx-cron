import _ from 'lodash';
import logger from '../utils/logger';

export default {
    getAvgAdvertsPerGroup(advertsCnt, groups, totalStats) {
        const startAdvertsCnt = advertsCnt;

        // Get fill percentage of total demand count
        const demandFill = advertsCnt / totalStats.demand;

        const getDemandedGroups = groups => {
            // Find groups where demand of advert > 0
            return groups.filter(group => group.demand > 0);
        }

        // Find groups which have demand of adverts
        let notFilledGroups = getDemandedGroups(groups);

        // Return empty when hasn't not filled groups
        if(!notFilledGroups.length) {
            return {};
        }

        for(let group of notFilledGroups) {
            const demand = group.demand;

            console.log(
                `tmp log [${group.name}]`,
                `demand=${demand}`,
                `demand-fill=${demandFill}`,
                `add=${Math.floor(demand * demandFill)}`
            );

            // Get adverts count that can be added
            const countToAdd = Math.floor(group.demand * demandFill);

            // Decrease count of total adverts
            advertsCnt -= countToAdd;
            // Increase count of adverts per group
            group.total += countToAdd;

            if(!group.new) {
                group.new = 0;
            }

            // Save new added count
            group.new += countToAdd;
        }

        // Return empty when new adverts count not changed
        if(startAdvertsCnt === advertsCnt) {
            return {};
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

        //logger.log(Object.keys(assignments).length,`Get assignments (ass=${Object.keys(assignments).length})`, assignments);
        return assignments;
    },

    assignToGroups(adverts, groups, totalStats) {
        const oldGroupStatsLog = groups.map(g => [g.name, g.total, g.demand]);

        const updatedStats = this.getAvgAdvertsPerGroup(adverts.length, groups, totalStats);

        if(_.isEmpty(updatedStats)) {
            logger.warning(`Calculate adverts: Hasn't demand for assignments`);
            return {};
        }

        logger.info(`Calculated adverts to assign (new-adv=${adverts.length}, tot-dem=${totalStats.demand})`, {
            old: oldGroupStatsLog,
            new: groups.map(g => [g.name, g.total, g.demand])
        });

        return this.assignAdvertsToGroups(adverts, updatedStats.filter(g => g.new));
    }
}