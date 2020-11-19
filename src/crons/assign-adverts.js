import _ from 'lodash';
import logger from '../utils/logger';

import GroupDividerService from '../services/group-devider';
import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
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
            logger.warning(`AssignAdverts cron: Not found adverts`);
            return;
        }

        const assignments = GroupDividerService.assignToGroups(adverts, groups, all);

        if(_.isEmpty(assignments)) {
            logger.warning(`AssignAdverts cron: Not found assignments`);
            return;
        }

        await AdvertListService.saveAssignedAdverts(assignments, groups);
    }
}