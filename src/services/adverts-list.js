import mongoose from 'mongoose';
import {google} from 'googleapis';
import logger from "../utils/logger";

import PhoneList from "../sheets/phone-list";
import SheetsService from "./sheets-service";
import StatsService from "./stats";
import AdvertRepository from "../repositories/advert";
import {getConfigValue, delay} from "../utils";

export default {
    groupStatLoader: null,

    async getAssignDemand() {
        const stat = await StatsService.getGroupStat();
        return stat.groupsTotal.demand;
    },

    async getChecksDemand() {
        const [checkedAdverts, stat] = await Promise.all([
            AdvertRepository.getAllUnassigned(),
            StatsService.getGroupStat()
        ]);

        return checkedAdverts.length >= stat.groupsTotal.demand
            ? 0 : stat.groupsTotal.demand - checkedAdverts.length;
    },

    async getCrawlerDemand() {
        const [parsedAdverts, checkedAdverts, stat] = await Promise.all([
            AdvertRepository.getAllPreChecked(),
            AdvertRepository.getAllUnassigned(),
            StatsService.getGroupStat()
        ]);

        const total = parsedAdverts.length + checkedAdverts.length;

        return total >= stat.groupsTotal.demand
            ? 0 : stat.groupsTotal.demand - total;
    },

    async getParsedAdverts(limit) {
        const adverts = await AdvertRepository.getAllParsed(limit);
        logger.log(adverts.length,`Get parsed adverts (adv=${adverts.length})`);
        return adverts;
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

        let addedRows;
        try {
            await session.withTransaction(async (session) => {
                const saveChecked = await this._saveCheckedAdverts(checkedAdverts, session);
                this._checkIfSaveToDB(checkedAdverts.length, saveChecked.length, 'checked adverts');

                const saveFalseChecked = await this._saveFalseCheckedAdverts(allAdverts, saveChecked, session);
                this._checkIfSaveToDB(allAdverts.length - checkedAdverts.length, saveFalseChecked.length, 'false-checked adverts');

                addedRows = await SheetsService.saveNumbersToWorksheet(checkedAdverts);

                await StatsService.saveCheckStat(allAdverts.length, saveChecked.length, {session});

                logger.info(`Save checked numbers to PhoneCheck worksheet (num=${saveChecked.length})`, checkedAdverts.map(d => d.phone));
                logger.info(`Mark adverts as checked (true=${saveChecked.length}, false=${saveFalseChecked.length})`);
            });
        } catch (e) {
            if(addedRows && addedRows.length) {
                await SheetsService.undoSaveNumbersToWorksheet(addedRows);
            }

            logger.error(`Error while save checked adverts: ${e.message}`, e);
        } finally {
            session.endSession();
        }
    },

    async saveAssignments(assignments, groups) {
        try {
            await PhoneList.load();

            for (let group of groups) {
                if (!assignments[group.name] || !assignments[group.name].length) {
                    continue;
                }

                await this._saveGroupAssignments(group, assignments[group.name]); // 5 req
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

    async savePreCheckedAdverts(checkedAdverts, allAdverts) {
        const session = await mongoose.startSession();
        try {
            const checkedIds = checkedAdverts.map(adv => adv.url);
            const falseCheckedAdverts = allAdverts.filter(adv => !checkedIds.includes(adv.url));

            await session.withTransaction(async (session) => {
                await AdvertRepository.updateByIds(checkedAdverts, {pre_checked: true}, session);
                await AdvertRepository.updateByIds(falseCheckedAdverts, {pre_checked: false}, session);
            });

            logger.info(`Mark adverts as pre checked (true=${checkedAdverts.length}, false=${falseCheckedAdverts.length})`);
        } catch (e) {
            logger.error(`Error while save pre checked adverts: ${e.message}`, e);
        } finally {
            session.endSession();
        }
    },

    async _saveGroupAssignments(group, adverts) {
        const session = await mongoose.startSession();

        let worksheet, added, savedToWorksheet, transRetries = 0;
        try {
            ({added, worksheet} = await SheetsService.appendAdvertsToWorksheet(adverts, group.name)); // 2 req

            await session.withTransaction(async (session) => {
                if(transRetries > 0) {
                    logger.warning(`Transaction retries (${transRetries})`);
                }
                transRetries++;

                const savedAdverts = await this._saveAssignedAdverts(adverts, group.name, session);
                this._checkIfSaveToDB(adverts.length, savedAdverts.length, `${group.name} assigned adverts`);

                await SheetsService.saveWorksheet(worksheet);
                savedToWorksheet = true;

                await delay(2000);

                const groupStatSaved = await StatsService.saveGroupStat(group.name, session); // 3 req
                this._checkIfSaveToDB(1, groupStatSaved.length, `${group.name} stat`);

                await StatsService.saveGroupAssignStat(group.name, savedAdverts.length, {session});

                logger.info(`Save assignments (gr=${group.name}, adv=${savedAdverts.length})`);
            });
        } catch (e) {
            if(savedToWorksheet) {
                await SheetsService.undoSaveAdvertsToWorksheet(PhoneList, group.name, added); // 1 req
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
            spreadsheetId: getConfigValue('sheets.phone_list.id', false),
            requestBody: {
                requests:[{
                    autoFill: {
                        useAlternateSeries: false,
                        range:'',
                        sourceAndDestination: {
                            "dimension": "ROWS",
                            "fillLength": 10,
                            "source": {
                                "sheetId": getConfigValue('sheets.phone_list.worksheets.group1', false),
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