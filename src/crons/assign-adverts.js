import _ from 'lodash';
import logger from '../utils/logger';

import GroupDividerService from '../services/group-devider';
import AdvertListService from '../services/adverts-list';
import StatsService from '../services/stats';

export default {
    async execute() {
        try {
            const stat = await StatsService.getGroupStat();

            if(_.isEmpty(stat)) {
                logger.warning(`AssignAdverts cron: Not found group stat`);
                return;
            }

            const groupsTotal = await stat.getGroupsTotal();

            if(!groupsTotal.demand) {
                logger.warning(`AssignAdverts cron: There isn't demand`);
                return;
            }

            const adverts = await AdvertListService.getUnassignedAdverts(groupsTotal.demand);

            if(_.isEmpty(adverts)) {
                return;
            }

            const assignments = GroupDividerService.assignToGroups(adverts, stat.groups, groupsTotal);

            if(_.isEmpty(assignments)) {
                return;
            }

            await AdvertListService.saveAssignments(assignments, stat.groups);
        } catch (e) {
            logger.error(`Error while running AssignAdverts cron: ${e.message}`, e);
        }
    }
}