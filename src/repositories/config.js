import Config from "../models/config";

export default {
    async getByKey(key) {
        return Config.findOne({
            key: key
        });
    },

    async getByKeys(keys) {
        return Config.find({
            key: {$in: keys}
        });
    },

    async updateByKey(key, value, session) {
        const query = Config
            .updateOne({ key }, {$set: { value }});

        if(session) {
            query.session(session);
        }

        return query.exec();
    },
};