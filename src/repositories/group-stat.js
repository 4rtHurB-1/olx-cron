import GroupStat from "../models/group-stat";
import moment from 'moment';
import {sumStats} from "../utils";
import logger from "../utils/logger";
import _ from 'lodash';

export default {
    insertMany(groups) {
        return GroupStat.insertMany(groups);
    },

    async getAll() {
        return GroupStat
            .find({
                created_at: {
                    $gte: moment().startOf('day').toISOString()
                }
            })
            .limit(10);
    },

    async getTotalStats() {
        const stats = await this.getAll();
        if(_.isEmpty(stats)) {
            return false;
        }

        return sumStats(stats);
    }
};