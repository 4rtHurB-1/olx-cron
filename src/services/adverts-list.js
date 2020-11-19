import moment from 'moment';
import {google} from 'googleapis';
import logger from "../utils/logger";
import config from "../config";

import {sumStats} from "../utils";
import GroupStatRepository from "../repositories/group-stat";
import PhoneList from "../sheets/phone-list";
import AdvertRepository from "../repositories/advert";

export default {
    async getAdvertDemand() {
        let stats = await GroupStatRepository.getTotalStats();
        /*if(!stats) {
            stats = sumStats(await this.getGroupStats());
        }*/
        return stats ? stats.demand : false;
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
        logger.info(`Get parsed unchecked adverts (adv=${adverts.length})`);
        return adverts;
    },

    async getUnassignedAdverts(limit) {
        const adverts = await AdvertRepository.getAllUnassigned(limit);
        logger.info(`Get checked unassigned adverts (adv=${adverts.length})`);
        return adverts;
    },

    async saveCheckedAdverts(checkedAdverts, allAdverts) {
        const ids = []//checkedAdverts.map(a => a.url)//[];

        const promises = [];
        for(let adv of checkedAdverts) {
            promises.push(AdvertRepository.updateOne(adv.url, adv).then(() => ids.push(adv.url)));
        }
        await Promise.all(promises);

        const unCheckedAdverts = allAdverts.filter(a => !ids.includes(a.url));
        await AdvertRepository.updateByIds(unCheckedAdverts, {checked: false});

        logger.info(`Mark as checked to CheckedAdverts (true=${checkedAdverts.length}, false=${unCheckedAdverts.length})`);
    },

    async saveAssignedAdverts(assignments, groupStats) {
        await PhoneList.load();

        for (let groupStat of groupStats) {
            const groupName = groupStat.group;
            groupStat.new = 0;

            if(!assignments[groupName] || !assignments[groupName].length) {
                logger.debug(`Skip assignments (gr=${groupName}): Not found adverts`);
                continue;
            }

            const worksheet = await PhoneList.loadWorksheet(groupName);

            await Promise.all([
                this.saveAdvertsToWorksheet1(assignments[groupName], groupName),
                AdvertRepository.updateByIds(assignments[groupName], {assigned_to: groupName}),
                groupStat.save()
            ]);

            logger.debug(`Save assignments (gr=${groupName})`);
        }
    },

    async saveAdvertsToWorksheet1(adverts, worksheetName) {
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

        const res = await PhoneList.appendToWorksheet(worksheetName, data, position);
        logger.info(`Save adverts to worksheet (adv=${adverts.length}, ws=${worksheetName})`, res);
    },

    async saveAdvertsToWorksheet(adverts, worksheet) {
        let rowId = this.getRowIdToAppend(worksheet);
        for(let advert of adverts) {
            this.setAdvertToRow(advert, worksheet, rowId);
            rowId++;
        }

        const res = await worksheet.saveUpdatedCells({raw: true});
        logger.info(`Save adverts to worksheet (adv=${adverts.length}, ws=${worksheet.title})`, res);
    },

    getRowIdToAppend(worksheet) {
        let rowId = 1;
        for(let r = 1; r < 100; r++) {
            if(!worksheet.getCell(r, 1).value) {
                rowId = r;
                break;
            }
        }

        return rowId;
    },

    setAdvertToRow(advert, worksheet, rowIndex) {
        worksheet.getCell(rowIndex, 0).value = moment().format('DD.MM.YYYY HH:mm');
        worksheet.getCell(rowIndex, 1).value = advert.gender;
        worksheet.getCell(rowIndex, 2).value = advert.phone;
        worksheet.getCell(rowIndex, 3).value = advert.url;
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
            logger.info(`Get group stat from DB (st=${stat.length})`, stat);
            return stat;
        }

        stat = await this.loadGroupStats();
        await GroupStatRepository.insertMany(stat);
        logger.info(`Get and save group stat (st=${stat.length})`, stat);

        return GroupStatRepository.getAll();
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