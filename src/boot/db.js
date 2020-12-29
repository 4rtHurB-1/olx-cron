import mongoose from 'mongoose';
import logger from '../utils/logger';
import {getConfigValue} from "../utils";

mongoose.Promise = Promise;

export default {
  async connect() {
    try {
      let dbUrl = getConfigValue('db.url', false);

      await mongoose.connect(dbUrl, {
        useNewUrlParser: true
      });
      logger.info(`Connected to ${dbUrl}`);
      return true;
    } catch (e) {
      logger.error(`Error while connect to mongodb: ${e.message}`, e);
      return false;
    }
  }
}