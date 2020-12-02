import _ from 'lodash';
import logger from '../utils/logger';

import GroupDividerService from '../services/group-devider';
import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        try {
            const stats = await AdvertListService.getGroupStat();

            if(_.isEmpty(stats)) {
                logger.warning(`AssignAdverts cron: Not found group stat`);
                return;
            }

            const {groupsTotal, groups} = stats;

            if(!groupsTotal.demand) {
                logger.warning(`AssignAdverts cron: There isn't demand`);
                return;
            }

            const adverts = await AdvertListService.getUnassignedAdverts(groupsTotal.demand);

            if(_.isEmpty(adverts)) {
                return;
            }

            const assignments = GroupDividerService.assignToGroups(adverts, groups, groupsTotal);

            if(_.isEmpty(assignments)) {
                return;
            }

            await AdvertListService.saveAssignments(assignments, groups);
        } catch (e) {
            logger.error(`Error while running AssignAdverts cron: ${e.message}`, e);
        }
    }
}