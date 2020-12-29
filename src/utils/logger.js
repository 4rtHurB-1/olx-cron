import winston from 'winston';
const TelegramLogger = require('winston-telegram')
require('winston-mongodb');
import moment from 'moment';
import {getConfigValue} from "./index";

const getDbTransportParams = () => {
  const db = getConfigValue('logs.db', false);

  return {
    db: db.url,
    collection: db.collection,
    decolorize: true
  };
}

const getTelTransportParams = () => {
  const tel = getConfigValue('logs.tel', false);

  return {
    name: 'info-channel',
    token: tel.token,
    chatId: tel.chat_id,
    level: 'info',
    unique: true,
    template: '{message}',
    disableNotification: true,
    formatMessage: (options) => options.message.split(': ')[1]
  }
}

const logger = winston.createLogger({
  format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(info => `[${moment(info.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}][${info.level}]${info.message}`)
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({level: 'debug'}),
    new winston.transports.MongoDB({
      ...getDbTransportParams(),
      level: 'debug',
    }),
    new winston.transports.MongoDB({
      ...getDbTransportParams(),
      level: 'error',
    })
  ],
  exitOnError: false
});

if(process.env.ENV !== 'test') {
  logger.add(
      new TelegramLogger({
        ...getTelTransportParams(),
        level: 'debug'
      })
  );

  logger.add(
      new TelegramLogger({
        ...getTelTransportParams(),
        level: 'error'
      })
  );
}

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

  info(message, ...params) {
    this._log('info', message, params);
  },

  warning(message, ...params) {
    this._log('warn', message, params);
  },

  error(message, ...params) {
    this._log('error', message, params);
  },

  debug(message, ...params) {
    this._log('debug', message, params);
  },

  debugOrWarn(cond, message, ...params) {
    this._log(cond ? 'debug' : 'warn', message, params);
  },

  infoOrWarn(cond, message, ...params) {
    this._log(cond ? 'info' : 'warn', message, params)
  },
};