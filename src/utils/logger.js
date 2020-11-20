import winston from 'winston';
require('winston-mongodb');
import moment from 'moment';
import config from "../config";
var path = require('path');
var scriptName = path.basename(__filename);

const mongoDbTransportParams = {
  db: config.db.url,
  collection: 'logs',
  decolorize: true
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(info => `[${moment(info.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}][${info.level}]${info.message}`)
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({level: 'debug'}),
    new winston.transports.MongoDB({
      ...mongoDbTransportParams,
      level: 'debug',
    }),
   /* new winston.transports.MongoDB({
      ...mongoDbTransportParams,
      level: 'warn',
    }),
    new winston.transports.MongoDB({
      ...mongoDbTransportParams,
      level: 'error',
    })*/
  ],
  exitOnError: false
});

export default {
  setLabel(label) {
    this.label = label;
  },

  _log(level, message, meta) {
    const transform = (m) => {
      if(typeof m === 'object' && m._doc) {
        return m._doc;
      }

     /* if(typeof m === 'object') {
        Object.values()
      }*/

      return m;
    }

    if(Array.isArray(meta)) {
      meta = meta.map(transform);
    } else {
      meta = transform(meta);
    }

    if(this.label) {
      message = `[${this.label}]: ${message}}`;
    } else {
      message = `: ${message}`;
    }

    logger.log(level, message, {
      metadata: meta
    });
  },

  info(message, meta) {
    this._log('info', message, meta);
  },

  debug(message, meta) {
    this._log('debug', message, meta);
  },

  warning(message, meta) {
    this._log('warn', message, meta);
  },

  error(message, meta) {
    this._log('error', message, meta);
  },
};