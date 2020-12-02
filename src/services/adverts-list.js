import mongoose from 'mongoose';
import {google} from 'googleapis';
import _ from 'lodash';
import logger from "../utils/logger";
import config from "../config";

import PhoneList from "../sheets/phone-list";
import PhoneCheck from "../sheets/phone-check";
import SheetsService from "./sheets-service";
import StatRepository from "../repositories/stat";
import AdvertRepository from "../repositories/advert";

export default {
    groupStatLoader: null,

    async getAdvertDemand() {
        let stat = await this.getGroupStat();
        return stat ? stat.groupsTotal.demand : false;
    },

    async loadGroupStats(groupName = null) {
        await SheetsService.loadSheet(PhoneList);

        if(groupName) {
            const groupIndex = groupName.replace(/[^0-9]/g, '');
            return {
                name: groupName,
                total: SheetsService.getCellValue(PhoneList, 1, groupIndex - 1)
            }
        }

        const groupLength = 9;
        const stats = [];
        for(let r = 0; r < 2; r++) {
            for(let c = 0; c < groupLength; c++) {
                let value = SheetsService.getCellValue(PhoneList, r, c);
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

    async getParsedUncheckedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnchecked(limit);
        logger.log(adverts.length,`Get parsed unchecked adverts (adv=${adverts.length})`);
        return adverts;
    },

    async getUnassignedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnassigned(limit);
        logger.log(adverts.length, `Get checked unassigned adverts (adv=${adverts.length})`);
        return adverts;
    },

    async saveCheckedAdverts(checkedAdverts, allAdverts) {
        const session = await mongoose.startSession();

        let added, worksheet, savedToWorksheet;
        try {
            session.startTransaction();

            ({added, worksheet} = await SheetsService.appendNumbersToWorksheet(checkedAdverts));

            const saveChecked = await this._saveCheckedAdverts(checkedAdverts, session);
            this._checkIfSaveToDB(checkedAdverts.length, saveChecked.length, 'checked adverts');

            const saveFalseChecked = await this._saveFalseCheckedAdverts(allAdverts, saveChecked, session);
            this._checkIfSaveToDB(allAdverts.length - checkedAdverts.length, saveFalseChecked.length, 'false-checked adverts');

            await SheetsService.saveWorksheet(worksheet);
            savedToWorksheet = true;

            await StatRepository.saveCheckStat(allAdverts.length, saveChecked.length, {session});

            await session.commitTransaction();
            logger.info(`Save checked numbers to PhoneCheck worksheet (num=${saveChecked.length})`, checkedAdverts.map(d => d.phone));
            logger.info(`Mark adverts as checked (true=${saveChecked.length}, false=${saveFalseChecked.length})`);
        } catch (e) {
            if(savedToWorksheet) {
                await SheetsService.undoSaveWorksheet(PhoneCheck, 'main', added);
            }
            await session.abortTransaction();
            logger.error(`Error while save checked adverts: ${e.message}`);
        } finally {
            session.endSession();
        }
    },

    async saveAssignments(assignments, groups) {
        try {
            await SheetsService.loadSheet(PhoneList);

            for (let group of groups) {
                if (!assignments[group.name] || !assignments[group.name].length) {
                    continue;
                }

                await this._saveGroupAssignments(group, assignments[group.name]);
            }
        } catch (e) {
            logger.error(`Error while save assignments: ${e.message}`);
        }
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

    async _saveGroupStat(group, session) {
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

    async _saveGroupAssignments(group, adverts) {
        const session = await mongoose.startSession();

        let worksheet, added, savedToWorksheet;
        try {
            ({added, worksheet} = await SheetsService.appendAdvertsToWorksheet(adverts, group.name));

            await session.withTransaction(async (session) => {
                const savedAdverts = await this._saveAssignedAdverts(adverts, group.name, session);
                this._checkIfSaveToDB(adverts.length, savedAdverts.length, `${group.name} assigned adverts`);

                await SheetsService.saveWorksheet(worksheet);
                savedToWorksheet = true;

                const groupStatSaved = await this._saveGroupStat(group, session);
                this._checkIfSaveToDB(1, groupStatSaved.length, `${group.name} stat`);

                await StatRepository.saveGroupAssignStat(group.name, savedAdverts.length, {session});

                logger.info(`Save assignments (gr=${group.name}, adv=${savedAdverts.length})`);
            });
        } catch (e) {
            if(savedToWorksheet) {
                await SheetsService.undoSaveWorksheet(PhoneList, group.name, added);
            }

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