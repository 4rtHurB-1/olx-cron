import moment from 'moment';
import {google} from 'googleapis';
import logger from "../utils/logger";
import config from "../config";
import mongoose from 'mongoose';

import {sumStats} from "../utils";
import GroupStatRepository from "../repositories/group-stat";
import PhoneList from "../sheets/phone-list";
import AdvertRepository from "../repositories/advert";
import PhoneCheckerService from "./phone-checker";

export default {
    async getAdvertDemand() {
        let stats = await GroupStatRepository.getTotalStats();
        /*if(!stats) {
            stats = sumStats(await this.getGroupStats());
        }*/
        return stats ? stats.demand : false;
    },

    async loadGroupStats() {
        await PhoneList.load();

        const stats = [];
        for(let r = 0; r < 2; r++) {
            for(let c = 0; c < 9; c++) {
                let value = PhoneList.main.getCell(r, c).value;
                if(r === 0) {
                    stats.push({group: `group${c+1}`});
                } else if(r === 1){
                    stats[c].total = value;
                }
            }
        }

        return stats;
    },

    async getGroupStats() {
        let stat = await GroupStatRepository.getAll();
        if(stat.length) {
            return stat;
        }

        stat = await this.loadGroupStats();
        await GroupStatRepository.insertMany(stat);
        logger.info(`Get and save group stat (st=${stat.length})`, stat.map(s => [s.group, s.total]));

        return GroupStatRepository.getAll();
    },

    async getGroupAdverts() {
        const stats = await this.getGroupStats();

        if(!stats) {
            return false;
        }

        return {
            all: sumStats(stats),
            groups: stats
        }
    },

    async getParsedUncheckedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnchecked(limit);
        logger.log(adverts.length ? 'info' : 'warn',`Get parsed unchecked adverts (adv=${adverts.length})`);
        return adverts;
    },

    async getUnassignedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnassigned(limit);
        logger.log(adverts.length ? 'info' : 'warn', `Get checked unassigned adverts (adv=${adverts.length})`);
        return adverts;
    },

    async saveCheckedAdverts(checkedAdverts, allAdverts) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const worksheet = await PhoneCheckerService.appendNumbersToWorksheet(checkedAdverts);

            const saveChecked = await this._saveCheckedAdverts(checkedAdverts, session);
            this._checkIfSaveToDB(checkedAdverts.length, saveChecked.length, 'checked adverts');

            const saveFalseChecked = await this._saveFalseCheckedAdverts(allAdverts, saveChecked, session);
            this._checkIfSaveToDB(allAdverts.length - checkedAdverts.length, saveFalseChecked.length, 'false-checked adverts');

            await PhoneCheckerService.saveWorksheet(worksheet);

            await session.commitTransaction();

            logger.info(`Save checked numbers to PhoneCheck worksheet (num=${checkedAdverts.length})`, checkedAdverts.map(d => d.phone));
            logger.info(`Mark adverts as checked (true=${saveChecked.length}, false=${saveFalseChecked.length})`);
        } catch (e) {
            await session.abortTransaction();
            logger.error(`Error while save checked adverts: ${e.message}`);
        } finally {
            session.endSession();
        }
    },

    async saveAssignments(assignments, groupStats) {
        try {
            await PhoneList.load();

            for (let groupStat of groupStats) {
                const groupName = groupStat.group;
                groupStat.new = 0;

                if (!assignments[groupName] || !assignments[groupName].length) {
                    logger.info(`Skip assignments (gr=${groupName}): Not found adverts`);
                    continue;
                }

                await this._saveGroupAssignments(groupName, assignments[groupName], groupStat);
            }
        } catch (e) {
            logger.error(`Error while save assigned adverts: ${e.message}`);
        }
    },

    async appendAdvertsToWorksheet(adverts, worksheetName) {
        const position = {row: 1, column: 0};

        const data = [];
        for(let adv of adverts) {
            data.push({
                date: moment().format('DD.MM.YYYY HH:mm'),
                gender: adv.gender,
                phone: adv.phone,
                key: adv.url
            });
        }

        return PhoneList.appendToWorksheet(worksheetName, data, position);
    },

    async _saveCheckedAdverts(checkedAdverts, session) {
        const ids = [];
        const promises = [];
        for(let adv of checkedAdverts) {
            promises.push(AdvertRepository.updateOne(adv.url, adv, session));
        }
        let res = await Promise.all(promises);
        for(let [i, r] of res.entries()) {
            if(r.ok && r.nModified) {
                ids.push(checkedAdverts[i].url);
            }
        }

        return ids;
    },

    async _saveAssignedAdverts(adverts, groupName, session) {
        const res = await AdvertRepository.updateByIds(adverts, {assigned_to: groupName}, session);

        return res && res.ok && res.nModified === adverts.length
            ? adverts.map(a => a.url)
            : [];
    },

    async _saveGroupStat(groupStat, session) {
        const res = await groupStat.save({session});
        return res && res._id ? [res._id] : [];
    },

    async _saveGroupAssignments(groupName, adverts, groupStat) {
        const session = await mongoose.startSession();

        try {
            const worksheet = await this.appendAdvertsToWorksheet(adverts, groupName);

            const savedCount = await session.withTransaction(async (session) => {
                const savedAdverts = await this._saveAssignedAdverts(adverts, groupName, session);
                const groupStatSaved = await this._saveGroupStat(groupStat, session);

                this._checkIfSaveToDB(adverts.length, savedAdverts.length, `${groupName} assigned adverts`);
                this._checkIfSaveToDB(1, groupStatSaved.length, `${groupName} stat`);

                await worksheet.saveUpdatedCells({raw: true});

                return savedAdverts.length;
            });

            logger.info(`Save assignments (gr=${groupName}, adv=${savedCount})`);
        } catch (e) {
            logger.error(`Error while save group assignments: ${e.message}`);
        } finally {
            session.endSession();
        }
    },

    async _saveFalseCheckedAdverts(allAdverts, savedCheckedAdvertIDs, session) {
        const unCheckedAdverts = allAdverts.filter(a => !savedCheckedAdvertIDs.includes(a.url));
        const res = await AdvertRepository.updateByIds(unCheckedAdverts, {checked: false}, session);

        return res && res.ok && res.nModified === unCheckedAdverts.length
            ? unCheckedAdverts.map(a => a.url)
            : [];
    },

    _checkIfSaveToDB(needSave, saved, key = 'records') {
        if(needSave > 0 && (!saved || needSave !== saved)) {
            throw new Error(`Failed to save ${key} (${saved ? saved : 0} from ${needSave})`)
        }
    },

    initGApi() {
        const auth = new google.auth.Compute({
            "project_id": "olx-cron-1605099552389",
            "api_key": "AIzaSyDn3SDz6NMeyfmp4c6wM7MOw2qRhxJO_Ro",
            serviceAccountEmail: 'node-cron@olx-cron-1605099552389.iam.gserviceaccount.com',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({version: 'v4', auth});
        sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: config.sheets.phone_list.id,
            requestBody: {
                requests:[{
                    autoFill: {
                        useAlternateSeries: false,
                        range:'',
                        sourceAndDestination: {
                            "dimension": "ROWS",
                            "fillLength": 10,
                            "source": {
                                "sheetId": config.sheets.phone_list.worksheets.group1,
                                start_row_index: 0,
                                end_row_index: 1,
                                start_column_index: 4,
                                end_column_index: 5
                            }
                        },
                    }
                }]
            },
            range: 'Class Data!A2:E',
        }, (err, res) => {
            console.log(err);
            console.log(res);
        });
    }
}