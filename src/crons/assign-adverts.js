import _ from 'lodash';
import logger from '../utils/logger';

import GroupDividerService from '../services/group-devider';
import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        try {
            const stats = await AdvertListService.getGroupAdverts();

            if(!stats) {
                logger.warning(`AssignAdverts cron: Not found stats`);
                return;
            }

            const {all, groups} = stats;

            if(!all.demand) {
                logger.warning(`AssignAdverts cron: There isn't demand`);
                return;
            }

            const adverts = await AdvertListService.getUnassignedAdverts(all.demand);

            if(!adverts.length) {
                return;
            }

            const assignments = GroupDividerService.assignToGroups(adverts, groups, all);

            if(_.isEmpty(assignments)) {
                return;
            }

            await AdvertListService.saveAssignments(assignments, groups);
        } catch (e) {
            logger.error(`Error while running AssignAdverts cron: ${e.message}`, e);
        }
    }
}