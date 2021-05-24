
import Advert from "../models/advert";
import {getConfigValue} from "../utils";


export default {
    async getGenderCategoryCond() {
        const genderCategories = await getConfigValue('gender_categories');
        return Array.isArray(genderCategories) && genderCategories.length
            ? {gender: {$in: genderCategories}}
            : {};
    },

    async getAllParsed(limit = 10) {
        return Advert
            .find({
                phone: { $exists: true },
                checked: { $eq: null },
                pre_checked: { $eq: null },
                locations: 'Хмельницький'
            })
            .limit(limit)
            .select({ _id: 1, phone: 1, url: 1, checked: 1, username: 1, gender: 1});
    },

    async getAllUnchecked(limit = 10) {
        return Advert
            .find({
                phone: { $exists: true },
                checked: { $eq: null },
                pre_checked: {
                    $in: [null, true]
                },
                locations: 'Хмельницький',
                ...await this.getGenderCategoryCond()
            })
            .sort({ pre_checked: -1 })
            .limit(limit)
            .select({ _id: 1, phone: 1, url: 1, checked: 1, pre_checked: 1, username: 1, gender: 1});
    },

    async getAllPreChecked(limit) {
        let query =  Advert
            .find({
                checked: { $eq: null },
                pre_checked: { $eq: true },
                ...await this.getGenderCategoryCond()
            })
            .select({ _id: 1, phone: 1, url: 1, checked: 1, pre_checked: 1, username: 1, gender: 1});

        if(limit) {
            query = query.limit(limit);
        }

        return query;
    },

    async getAllUnassigned(limit) {
        let query = Advert
            .find({
                assigned_to: { $eq: null },
                checked: { $eq: true },
                ...await this.getGenderCategoryCond()
            })
            .select({ _id: 1, phone: 1, url: 1, assigned_to: 1, gender: 1});

        if(limit) {
            query = query.limit(limit);
        }

        return query;
    },

    updateByIds(adverts, doc, session) {
        let ids = adverts;
        if(Array.isArray(adverts) && typeof adverts[0] === 'object') {
            ids = adverts.map(a => a.url);
        }

        //logger.info(`Update Adverts (adv=${adverts.length}, doc=${JSON.stringify(doc)})`, {ids, doc});
        const query = Advert
            .updateMany({url: {$in: ids}}, {$set :doc});

        if(session) {
            query.session(session);
        }

        return query.exec();
    },

    insertMany(adverts) {
        return Advert
            .insertMany(adverts);
    },

    async updateOne(id, doc, session) {
        return Advert
            .updateOne({url: id}, {$set: doc})
            .session(session)
            .exec();
    },

    getByUrls(urls) {
        return Advert
            .find({
                url: {$in: urls},
            })
            .select({ _id: 1, phone: 1, url: 1, checked: 1, pre_checked: 1, username: 1, gender: 1});
    }
};