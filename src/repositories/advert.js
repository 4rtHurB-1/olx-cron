import logger from '../utils/logger';
import Advert from "../models/advert";

export default {
    async getAllUnchecked(limit = 10) {
        return Advert
            .find({
                phone: {$exists:true},
                checked: { $eq: null }
            })
            .limit(limit)
            .select({ _id: 1, phone: 1, url: 1, checked: 1, username: 1, gender: 1});
    },

    async getAllUnassigned(limit = 10) {
        return Advert
            .find({
                assigned_to: {$eq: null},
                checked: { $eq: true }
            })
            .limit(limit)
            .select({ _id: 1, phone: 1, url: 1, assigned_to: 1, gender: 1});
    },

    updateByIds(adverts, doc) {
        const ids = adverts.map(a => a.url);
        logger.info(`Update Adverts (adv=${adverts.length}, doc=${JSON.stringify(doc)})`, {ids, doc});
        return Advert
            .updateMany({url: {$in: ids}}, {$set :doc});
    },

    updateOne(id, doc) {
        return Advert
            .updateOne({url: id}, {$set: doc});
    }
};