import _ from 'lodash';
import {getConfigValue} from "../utils";

import Stat from "../models/stat";

export default {
    get emptyCrawlerStat() {
        return {
            runs: 0,
            failed: 0,
            adverts: 0,
            avgMaxAdverts: 0,
            avgTimeExecution: 0
        };
    },

    get emptyCheckStat() {
        return {
            uniq: 0,
            total: 0,
        };
    },

    get emptyAssignStat() {
        return {
            total: 0,
            groups: {}
        };
    },

    get emptyGroupStat() {
        return [];
    },

    update(filter, doc, options) {
        let query = Stat.updateMany(filter, {$set: doc});

        if (options.session) {
            query = query.session(options.session);
        }

        return query.exec();
    },

    async createActualStat(stat, options = {}) {
        await this.update({actual: true}, {actual: false}, options);

        return Stat.create([{
            period: stat.period,
            groups: stat.groups || this.emptyGroupStat,
            crawler: stat.crawler || this.emptyCrawlerStat,
            assign: stat.assign || this.emptyAssignStat,
            check: stat.check || this.emptyCheckStat,
            actual: true,
        }], options);
    },

    updateActualStat(stat, options = {}) {
        return stat.save(options);
    },

    updateOrCreateActualStat(stat, options = {}) {
        if (stat._id && !stat.isExpire) {
            return this.updateActualStat(stat);
        } else {
            return this.createActualStat({period: stat.period}, options);
        }
    },

    async getOrCreateActualStat(createStat = {}) {
        const stat = await this.getActualStat();
        if (!stat || stat.isExpire) {
            if(_.isEmpty(createStat)) {
                createStat = {period: await getConfigValue('stat.period')};
            }

            await this.createActualStat(createStat);

            return this.getActualStat();
        }

        return stat;
    },

    async getActualStat() {
        const stats = await Stat
            .find({
                actual: true
            })
            .sort({created_at: 'desc'})
            .limit(1);

        return stats ? stats[0] : null;
    }
};