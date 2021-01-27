import _ from 'lodash';
import logger from '../utils/logger';

import GroupDividerService from '../services/group-devider';
import AdvertListService from '../services/adverts-list';
import StatsService from '../services/stats';

export default {
    async execute() {
        try {
            const demand = await AdvertListService.getAssignDemand();

            if (!demand) {
                logger.warning(`Assign demand (cnt=${demand})`, 'assigns');
                return;
            }

            const stat = await StatsService.getGroupStat();
            const adverts = await AdvertListService.getUnassignedAdverts(demand);

            if(_.isEmpty(adverts)) {
                logger.warning(`Not found adverts. Assign demand (cnt=${demand})`, 'assigns');
                return;
            }

            logger.debug(`Assign demand (cnt=${demand})`, 'assigns');

            const assignments = GroupDividerService.assignToGroups(adverts, stat.groups, stat.groupsTotal);

            if(_.isEmpty(assignments)) {
                return;
            }

            await AdvertListService.saveAssignments(assignments, stat.groups);
        } catch (e) {
            logger.error(`Error while running AssignAdverts cron - ${e.message}`, 'assigns', e);
        }
    }
}