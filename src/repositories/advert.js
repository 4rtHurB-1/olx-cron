import Advert from "../models/advert";

export default {
    async getAllParsed(limit = 10) {
        return Advert
            .find({
                phone: {$exists:true},
                checked: { $eq: null },
                pre_checked: { $eq: null },
            })
            .limit(limit)
            .select({ _id: 1, phone: 1, url: 1, checked: 1, username: 1, gender: 1});
    },

    async getAllUnchecked(limit = 10) {
        return Advert
            .find({
                phone: {$exists:true},
                checked: { $eq: null }
            })
            .sort({ pre_checked: -1 })
            .limit(limit)
            .select({ _id: 1, phone: 1, url: 1, checked: 1, pre_checked: 1, username: 1, gender: 1});
    },

    async getAllPreChecked(limit) {
        let query =  Advert
            .find({
                phone: {$exists:true},
                checked: false,
                pre_checked: true
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
                assigned_to: {$eq: null},
                checked: { $eq: true }
            })
            .select({ _id: 1, phone: 1, url: 1, assigned_to: 1, gender: 1});

        if(limit) {
            query = query.limit(limit);
        }

        return query;
    },

    updateByIds(adverts, doc, session) {
        const ids = adverts.map(a => a.url);
        //logger.info(`Update Adverts (adv=${adverts.length}, doc=${JSON.stringify(doc)})`, {ids, doc});
        return Advert
            .updateMany({url: {$in: ids}}, {$set :doc})
            .session(session)
            .exec();
    },

    async updateOne(id, doc, session) {
        return Advert
            .updateOne({url: id}, {$set: doc})
            .session(session)
            .exec();
    }
};