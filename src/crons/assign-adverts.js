import _ from 'lodash';
import logger from '../utils/logger';

import GroupDividerService from '../services/group-devider';
import AdvertListService from '../services/adverts-list';
import StatsService from '../services/stats';

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getAssignDemand();
            logger.debugOrWarn(demand, `Assign demand (cnt=${demand})`, 'assign-adverts');

            if (!demand) {
                return;
            }

            const stat = await StatsService.getGroupStat();
            const adverts = await AdvertListService.getUnassignedAdverts(demand);

            if(_.isEmpty(adverts)) {
                return;
            }

            const assignments = GroupDividerService.assignToGroups(adverts, stat.groups, stat.groupsTotal);

            if(_.isEmpty(assignments)) {
                return;
            }

            await AdvertListService.saveAssignments(assignments, stat.groups);
        } catch (e) {
            logger.error(`Error while running AssignAdverts cron: ${e.message}`, 'assign-adverts', e);
        }
    }
}