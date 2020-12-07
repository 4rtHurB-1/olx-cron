import winston from 'winston';
require('winston-mongodb');
import moment from 'moment';
import {getConfigValue} from "./index";

const getDbTransportParams = () => {
  const db = getConfigValue('logs_db', false);

  return {
    db: db.url,
    collection: db.collection,
    decolorize: true
  };
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(info => `[${moment(info.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}][${info.level}]${info.message}`)
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({level: 'info'}),
    new winston.transports.MongoDB({
      ...getDbTransportParams(),
      level: 'info',
    }),
    new winston.transports.MongoDB({
      ...getDbTransportParams(),
      level: 'warn',
    }),
    new winston.transports.MongoDB({
      ...getDbTransportParams(),
      level: 'error',
    })
  ],
  exitOnError: false
});

export default {
  labels: ['get-group-stats', 'run-crawler', 'phone-checks', 'assign-adverts'],

  setLabel(label) {
    this.label = label;
  },

  _log(level, message, params) {
    let label, meta;
    const transform = (m) => {
      if(typeof m === 'object' && m._doc) {
        return m._doc;
      }

      return m;
    }

    if(Array.isArray(params)) {
      if(params.length === 1) {
        if(typeof params[0] === 'string' && this.labels.includes(params[0])) {
          label = params[0];
        } else {
          meta = params[0];
        }
      } else if(params.length === 2) {
        label = params[0];
        meta = params[1];
      }
    }

    if(meta) {
      if(Array.isArray(meta)) {
        meta = meta.map(transform);
      } else {
        meta = transform(meta);
      }
    }

    if(label || this.label) {
      message = `[${label || this.label}]: ${message}`;
    } else {
      message = `: ${message}`;
    }

    logger.log(level, message, {
      metadata: meta
    });
  },

  log(cond, message, meta) {
    this._log(cond ? 'info' : 'warn', message, meta)
  },

  info(message, ...params) {
    this._log('info', message, params);
  },

  debug(message, ...params) {
    this._log('debug', message, params);
  },

  warning(message, ...params) {
    this._log('warn', message, params);
  },

  error(message, ...params) {
    this._log('error', message, params);
  },
};