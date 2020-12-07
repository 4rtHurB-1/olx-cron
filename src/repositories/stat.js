import moment from 'moment';
import _ from 'lodash';

import Stat from "../models/stat";

export default {
    update(filter, doc, options) {
        let query = Stat.updateMany(filter, {$set :doc});

        if(options.session) {
            query = query.session(options.session);
        }

        return query.exec();
    },

    async createStat(stat, options = {}) {
        await this.update({type: stat.type, actual: true}, {actual: false}, options);

        return Stat.create([{
            ...stat,
            actual: true,
        }], options);
    },

    saveStat(stat, options = {}) {
        if(stat._id && !stat.isExpire) {
            return stat.save(options);
        } else {
            return this.createStat({
                type: stat.type,
                period: stat.period,
                groups: stat.groups,
                crawler: stat.crawler,
                assign: stat.assign,
                check: stat.check,
            }, options);
        }
    },

    async saveCrawlerStat(success, data) {
        let stat = await this.getActualStat('crawler');

        if(_.isEmpty(stat)) {
            stat = {
                type: 'crawler',
                period: '1 hour',
                crawler: {
                    runs: 0,
                    failed: 0,
                    adverts: 0,
                    avgMaxAdverts: 0,
                    avgTimeExecution: 0
                }
            }
        }

        if(success) {
            stat.crawler.runs++;
            stat.crawler.adverts += data.adverts;
            //stat.crawler.avgMaxAdverts = (stat.crawler.avgMaxAdverts + data.maxAdverts) / stat.crawler.runs;
            stat.crawler.avgTimeExecution = (stat.crawler.avgTimeExecution + data.timeExecution) / stat.crawler.runs;
        } else {
            stat.crawler.failed++;
        }

        await this.saveStat(stat);
    },

    async saveGroupAssignStat(groupName, adverts, options) {
        let stat = await this.getActualStat('assign');

        if(_.isEmpty(stat)) {
            stat = {
                type: 'assign',
                period: '1 hour',
                assign: {
                    total: 0,
                    groups: {}
                }
            }
        }

        stat.assign.total += adverts;
        if(!stat.assign.groups[groupName]) {
            stat.assign.groups[groupName] = adverts;
        } else {
            stat.assign.groups[groupName] += adverts;
        }

        await this.saveStat(stat, options);
    },

    async saveCheckStat(total, uniq, options = {}) {
        let stat = await this.getActualStat('check');

        if(_.isEmpty(stat)) {
            stat = {
                type: 'check',
                period: '1 hour',
                check: {
                    uniq: 0,
                    total: 0,
                }
            }
        }

        stat.check.uniq += uniq;
        stat.check.total += total;

        await this.saveStat(stat, options);
    },

    async getActualStat(type) {
        const stats = await Stat
            .find({
                type,
                actual: true,
                created_at: {
                    $gte: moment().startOf('day').toISOString()
                }
            })
            .sort({created_at: 'desc'})
            .limit(1);

        return stats ? stats[0] : null;
    },

    async getGroupStat() {
        const stat = await this.getActualStat('group');

        if(!stat || stat.isExpire) {
            await this.createStat({
                type: 'group',
                period: '1 hour'
            });

            return this.getActualStat('group');
        }

        return stat;
    },

    async getAll() {
        return Stat
            .find({
                created_at: {
                    $gte: moment().startOf('day').toISOString()
                }
            })
            .limit(10);
    },

    getActual() {
        return Stat
            .find({
                actual: true,
            })
            .limit(5);
    }
};