import moment from "moment";
import _ from "lodash";
import logger from "../utils/logger";
import {getConfigValue} from "../utils";

import StatRepository from "../repositories/stat";
import PhoneList from "../sheets/phone-list";
import SheetService from "./sheets-service";

const worksheetName = 'stat';

export default {
    firstRowNumber: 12,
    lastRowNumber: 179,

    get emptyCrawlerStat() {
        return {
            type: 'crawler',
            period: '1 hour',
            crawler: {
                runs: 0,
                failed: 0,
                adverts: 0,
                avgMaxAdverts: 0,
                avgTimeExecution: 0
            }
        };
    },

    get emptyCheckStat() {
        return {
            type: 'check',
            period: '1 hour',
            check: {
                uniq: 0,
                total: 0,
            }
        };
    },

    get emptyAssignStat() {
        return {
            type: 'assign',
            period: '1 hour',
            assign: {
                total: 0,
                groups: {}
            }
        };
    },

    get emptyGroupStat() {
        return {
            type: 'group',
            period: '1 hour'
        };
    },

    get rowLength() {
        return this.lastRowNumber - this.firstRowNumber + 1;
    },

    get rowOffset() {
        return this.firstRowNumber - 2;
    },

    toSheetRow(stat, hoursFormula) {
        const date = moment.tz(moment(), 'Europe/Kiev').startOf('hour').format('DD.MM.YYYY HH:mm');

        const row =  [
            hoursFormula,
            date,
            stat.crawler.runs || 0,
            stat.crawler.failed || 0,
            stat.crawler.adverts || 0,
            stat.check.total || 0,
            stat.check.uniq || 0,
            stat.assign.total || 0
        ];

        for(let group of stat.groups) {
            row.push(group.total);
        }

        return row;
    },

    async getActualStat() {
        return StatRepository.getOrCreateActualStat();
    },

    async saveStatToWorksheet(stat, isNew) {
        await PhoneList.load(); // 1 req

        const rows = await PhoneList.getRows(worksheetName, this.rowLength, this.rowOffset);

        let rowNumber = rows.length ? rows[rows.length - 1].rowNumber : this.firstRowNumber;

        if (isNew) {
            if (rowNumber === this.lastRowNumber) {
                await rows[0].delete();
            }
        } else if (rows.length) {
            await rows[rows.length - 1].delete();
        }

        let hoursFormula = await getConfigValue('stat.hours_formula');
        hoursFormula = hoursFormula.replace(/:row/g, rowNumber);

        return PhoneList.addRows(worksheetName, [this.toSheetRow(stat, hoursFormula)]);
    },

    _parseGroupStat(columnIndex) {
        return {
            name: `group${columnIndex}`,
            total: parseInt(
                PhoneList.getCellValue(worksheetName, 1, columnIndex)
            ),
            demand: parseInt(
                PhoneList.getCellValue(worksheetName, 2, columnIndex)
            )
        }
    },

    async loadGroupStatFromWorksheet(groupName = null) {
        await PhoneList.load(); // 1 req
        await PhoneList.loadWorksheet(worksheetName); // 1 req

        if (groupName) {
            const groupIndex = groupName.replace(/[^0-9]/g, '');
            return this._parseGroupStat(groupIndex);
        }

        const groupLength = 9;
        const stats = [];
        for (let c = 1; c < groupLength + 1; c++) {
            stats.push(this._parseGroupStat(c));
        }

        return stats;
    },

    async _getGroupStat() {
        let stat = await StatRepository.getOrCreateActualStat();

        if (_.isEmpty(stat.groups)) {
            stat.groups = await this.loadGroupStatFromWorksheet();
            await StatRepository.updateActualStat(stat);
            logger.info(`Get and save group stat (st=${stat.groups.length})`);
        }

        this.groupStatGetter = null;

        return stat;
    },

    async getGroupStat() {
        if (!this.groupStatGetter) {
            this.groupStatGetter = this._getGroupStat();
        }

        return this.groupStatGetter;
    },

    async saveGroupStat(groupName, session) {
        let [stat, groupStat] = await Promise.all([
            StatRepository.getOrCreateActualStat(),
            this.loadGroupStatFromWorksheet(groupName) // 3 req
        ]);

        for (let group of stat.groups) {
            if (group.name === groupStat.name) {
                group.total = groupStat.total;
                group.demand = groupStat.demand;
                break;
            }
        }

        const res = await StatRepository.updateActualStat(stat, session ? {session} : {});
        return res && res._id ? [res._id] : [];
    },

    async saveCrawlerStat(success, data) {
        let stat = await StatRepository.getOrCreateActualStat();

        if (success) {
            stat.crawler.runs++;
            stat.crawler.adverts += data.adverts;
            //stat.crawler.avgMaxAdverts = (stat.crawler.avgMaxAdverts + data.maxAdverts) / stat.crawler.runs;
            stat.crawler.avgTimeExecution = (stat.crawler.avgTimeExecution + data.timeExecution) / stat.crawler.runs;
        } else {
            stat.crawler.failed++;
        }

        await StatRepository.updateActualStat(stat);
    },

    async saveGroupAssignStat(groupName, adverts, options) {
        let stat = await StatRepository.getOrCreateActualStat();

        stat.assign.total += adverts;
        if (!stat.assign.groups[groupName]) {
            stat.assign.groups[groupName] = adverts;
        } else {
            stat.assign.groups[groupName] += adverts;
        }

        await StatRepository.updateActualStat(stat, options);
    },

    async saveCheckStat(total, uniq, options = {}) {
        let stat = await StatRepository.getOrCreateActualStat();

        stat.check.uniq += uniq;
        stat.check.total += total;

        await StatRepository.updateActualStat(stat, options);
    },
}