import moment from "moment";
import _ from "lodash";
import logger from "../utils/logger";
import {getConfigValue} from "../utils";

import StatRepository from "../repositories/stat";
import PhoneList from "../sheets/phone-list";
import SheetService from "./sheets-service";

const worksheetName = 'stat';

export default {
    firstRowNumber: 6,
    lastRowNumber: 174,

    get totalRowLength() {
        return this.lastRowNumber - this.firstRowNumber;
    },

    parseCrawlerStat(stat) {
        return {
            runs: stat.crawler.runs,
            fails: stat.crawler.failed,
            parsed: stat.crawler.adverts,
        }
    },

    parseCheckStat(stat) {
        return {
            checked: stat.check.uniq,
            uniq: stat.check.total,
        }
    },

    parseAssignStat(stat) {
        return {
            assigned: stat.assign.total
        }
    },

    parseStat(stat) {
        switch (stat.type) {
            case 'crawler':
                return this.parseCrawlerStat(stat);
            case 'check':
                return this.parseCheckStat(stat);
            case 'assign':
                return this.parseAssignStat(stat);
        }
    },

    toSheetRow(stat, rowNumber) {
        const hoursFormula = getConfigValue('stat_hours_formula', false);

        return [
            hoursFormula.replace(/:row/g, rowNumber),
            stat.date, stat.runs, stat.fails, stat.parsed, stat.checked, stat.uniq, stat.assigned
        ];
    },

    async getGroupedActualStat() {
        const stats = await StatRepository.getActual();

        let actualStat = {
            date: moment().startOf('hour').format('DD.MM.YYYY HH:mm')
        }

        for(let stat of stats) {
            actualStat = {
                ...actualStat,
                ...this.parseStat(stat)
            }
        }

        return actualStat;
    },

    async saveStatToWorksheet(stat, isNew) {
        const rows = await SheetService.getRows(PhoneList, worksheetName, this.totalRowLength, this.firstRowNumber - 1);

        let rowNumber = rows.length ? rows[rows.length - 1].rowNumber : this.firstRowNumber;
        if(isNew) {
            if(rowNumber === this.lastRowNumber) {
                await rows[rows.length - 1].delete();
            }
        } else if(rows.length) {
            await rows[rows.length - 1].delete();
        }

        return SheetService.addRows(PhoneList, worksheetName, [this.toSheetRow(stat, rowNumber)], {raw: false});
    },

    async loadGroupStats(groupName = null) {
        await SheetService.loadSheet(PhoneList, worksheetName);

        if(groupName) {
            const groupIndex = groupName.replace(/[^0-9]/g, '');
            return {
                name: groupName,
                total: SheetService.getCellValue(PhoneList, worksheetName, 1, groupIndex - 1)
            }
        }

        const groupLength = 9;
        const stats = [];
        for(let r = 0; r < 2; r++) {
            for(let c = 0; c < groupLength; c++) {
                let value = SheetService.getCellValue(PhoneList, worksheetName, r, c);
                if(r === 0) {
                    stats.push({name: `group${c+1}`});
                } else if(r === 1) {
                    stats[c].total = value;
                }
            }
        }

        return stats;
    },

    async _loadGroupStat() {
        let groupStat = await StatRepository.getGroupStat();

        if(_.isEmpty(groupStat.groups)) {
            groupStat.groups = await this.loadGroupStats();
            await groupStat.save();
            logger.info(`Get and save group stat (st=${groupStat.groups.length})`, groupStat.groups.map(s => [s.name, s.total]));
        }

        this.groupStatLoader = null;
        return groupStat;
    },

    async getGroupStat() {
        if(!this.groupStatLoader) {
            this.groupStatLoader = this._loadGroupStat();
        }

        return this.groupStatLoader;
    },

    async saveGroupStat(group, session) {
        let [newGroupStat, groupStat] = await Promise.all([
            this.loadGroupStats(group.name),
            this.getGroupStat()
        ]);

        for(let group of groupStat.groups) {
            if(group.name === newGroupStat.name) {
                group.total = newGroupStat.total;
                break;
            }
        }

        const res = await groupStat.save({session});
        return res && res._id ? [res._id] : [];
    },
}