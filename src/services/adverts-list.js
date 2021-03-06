import mongoose from 'mongoose';
import {google} from 'googleapis';
import logger from "../utils/logger";

import PhoneList from "../sheets/phone-list";
import SheetsService from "./sheets-service";
import StatsService from "./stats";
import AdvertRepository from "../repositories/advert";
import {delay} from "../utils";

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
        logger.infoOrWarn(adverts.length,`Get parsed adverts (adv=${adverts.length})`);
        return adverts;
    },

    async getParsedUncheckedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnchecked(limit);
        logger.infoOrWarn(adverts.length,`Get parsed unchecked adverts (adv=${adverts.length})`);
        return adverts;
    },

    async getUnassignedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnassigned(limit);
        logger.infoOrWarn(adverts.length, `Get checked unassigned adverts (adv=${adverts.length})`);
        return adverts;
    },

    async saveExpiredAdverts(urls) {
        const res = await AdvertRepository.updateByIds(urls, {expired: true});
        return res && res.ok && res.nModified
            ? res.nModified
            : 0;
    },

    async saveCheckedAdverts(checkedAdverts, allAdverts) {
        const session = await mongoose.startSession();

        let saveRes = {saved: false, added: []}, transRetries = 0;

        await session.withTransaction(async (session) => {
            if (transRetries > 0) {
                logger.debug(`Transaction retries (ret=${transRetries})`);
            }
            transRetries++;

            this._setCheckedTrue(checkedAdverts);
            const saveChecked = await this._updateEveryAdvert(checkedAdverts, session);
            this._checkIfSaveToDB(checkedAdverts.length, saveChecked.length, 'checked adverts');

            const saveFalseChecked = await this._saveFalseCheckedAdverts(allAdverts, saveChecked, session);
            this._checkIfSaveToDB(allAdverts.length - checkedAdverts.length, saveFalseChecked.length, 'false-checked adverts');

            if (!saveRes.saved) {
                try {
                    saveRes = await SheetsService.saveNumbersToWorksheet(checkedAdverts);
                } catch (e) {
                    logger.error(`saveNumbersToWorksheet error here - ${e.message}`);
                    throw e;
                }
            }

            try {
                await StatsService.saveCheckStat(allAdverts.length, saveChecked.length, {session});
            } catch (e) {
                logger.error(`saveCheckStat error here - ${e.message}`);
                throw e;
            }

            try {
                logger.debug(`Mark adverts as checked (true=${saveChecked.length}, false=${saveFalseChecked.length})`, {
                    phones: checkedAdverts.map(d => d.phone)
                });
            } catch (e) {
                logger.error(`Log error here - ${e.message}`);
                throw e;
            }
        }).catch(async e => {
            if (saveRes.saved && saveRes.added.length) {
                await SheetsService.undoSaveNumbersToWorksheet(saveRes);
            }

            logger.error(`Error while save checked adverts - ${e.message}`, e);
        });

        session.endSession();
    },

    async saveAssignments(assignments, groups) {
        let resLog = '';
        let totalAssigned = 0;
        let res = [];

        try {
            await PhoneList.load();

            for (let group of groups) {
                if (!assignments[group.name] || !assignments[group.name].length) {
                    continue;
                }

                let result = await this._saveGroupAssignments(group, assignments[group.name]); // 5 req
                if(result) {
                    res.push(result);
                    totalAssigned += result.assigned;
                    resLog += `${result.group} = ${result.assigned} | `;
                }
            }

            if(totalAssigned) {
                logger.debug(`Assigned ${totalAssigned} adverts (${resLog.slice(0, resLog.length - 2)})`, res);
            }
        } catch (e) {
            logger.error(`Error while save assignments - ${e.message}`);
        }
    },

    async _updateEveryAdvert(checkedAdverts, session) {
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

    async _updateAllAdverts(adverts, doc, session) {
        const res = await AdvertRepository.updateByIds(adverts, doc, session);

        return res && res.ok && res.nModified === adverts.length
            ? adverts.map(a => a.url)
            : [];
    },

    async savePreCheckedAdverts(checkedAdverts, allAdverts) {
        const session = await mongoose.startSession();
        try {
            const checkedIds = [];
            for(let adv of checkedAdverts) {
                adv.pre_checked = true;
                checkedIds.push(adv.url);
            }
            const falseCheckedAdverts = allAdverts.filter(adv => !checkedIds.includes(adv.url));

            await session.withTransaction(async (session) => {
                await this._updateEveryAdvert(checkedAdverts, session);
                await this._updateAllAdverts(falseCheckedAdverts, {pre_checked: false}, session);
            });

            logger.debug(`Mark adverts as pre checked (true=${checkedAdverts.length}, false=${falseCheckedAdverts.length})`, {
                phones: checkedAdverts.map(adv => adv.phone)
            });
        } catch (e) {
            logger.error(`Error while save pre checked adverts - ${e.message}`, e);
        } finally {
            session.endSession();
        }
    },

    async _saveGroupAssignments(group, adverts) {
        const session = await mongoose.startSession();

        let saveRes = {saved: false, added: []}, savedAdverts, transRetries = 0;
        await session.withTransaction(async (session) => {
            if (transRetries === 0) {
                saveRes = await SheetsService.saveAdvertsToWorksheet(adverts, group.name); // 2 req
            } else {
                logger.debug(`Transaction retries (ret=${transRetries})`);
            }
            transRetries++;

            savedAdverts = await this._updateAllAdverts(adverts, {assigned_to: group.name}, session);
            this._checkIfSaveToDB(adverts.length, savedAdverts.length, `${group.name} assigned adverts`);

            if (!saveRes.saved && saveRes.worksheet) {
                await SheetsService.saveWorksheet(saveRes.worksheet);
                saveRes.saved = true;
            }

            await delay(2000);

            const groupStatSaved = await StatsService.saveGroupStat(group.name, session); // 3 req
            this._checkIfSaveToDB(1, groupStatSaved.length, `${group.name} stat`);

            await StatsService.saveGroupAssignStat(group.name, savedAdverts.length, {session});

            logger.info(`Save assignments (gr=${group.name}, adv=${savedAdverts.length})`);
        }).catch(async e => {
            savedAdverts = null;
            if (saveRes.saved && saveRes.added.length) {
                await SheetsService.undoSaveAdvertsToWorksheet(PhoneList, group.name, saveRes); // 1 req
            }

            logger.error(`Error while save group (gr=${group.name}) assignments - ${e.message}`);
        });

        session.endSession();

        return {
            group: group.name,
            assigned: savedAdverts ? savedAdverts.length : 0
        };
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

    _setCheckedTrue(adverts) {
        for(let adv of adverts) {
            adv.checked = true;
        }

        return adverts;
    }
}