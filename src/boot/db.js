import mongoose from 'mongoose';
import logger from '../utils/logger';
import config from '../config';

mongoose.Promise = Promise;

export default {
  async connect() {
    try {
      await mongoose.connect('mongodb://' + config.db.url, {
        useNewUrlParser: true,
      });
      logger.debug('Connected to mongodb:/' + config.db.url);
      return true;
    } catch (e) {
      logger.error('Failed connect to mongodb:/' + config.db.url);
      return false;
    }
  }
}