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
    }
};