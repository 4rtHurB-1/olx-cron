import mongoose from 'mongoose';
import logger from '../utils/logger';
import config from '../config';

mongoose.Promise = Promise;

export default {
  async connect() {
    try {
      await mongoose.connect(config.db.url, {
        useNewUrlParser: true,
      });
      logger.info(`Connected to ${config.db.url}`);
      return true;
    } catch (e) {
      logger.error(`Failed connect to mongodb: ${e.message}`);
      return false;
    }
  }
}