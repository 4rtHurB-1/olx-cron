import moment from 'moment';
import genderDetection from 'gender-detection';
import axios from 'axios';
const Inflector = require('inflected');
setUkrainianApproximations();
import logger from "./logger";
import allConfig from '../config';
const config = allConfig[process.env.ENV || 'prod'];

import ConfigRepository from '../repositories/config';

async function detectGenderByGenderizeApi(name) {
  const GENDERIZE_API = 'https://api.genderize.io';

  let res = await axios.get(GENDERIZE_API, {
    params: {
      name: Inflector.transliterate(name).replace(/\?/g, ''),
      country_id: 'UA'
    }
  });

  //logger.debug(`Gender detection (orig=${name} trans=${res.data.name} gender=${res.data.gender})`);

  return res.data.gender;
}

function setUkrainianApproximations() {
  Inflector.transliterations('en', function(t) {
    t.approximate('І', 'i');
    t.approximate('і', 'i');

    t.approximate('Є', 'Ye');
    t.approximate('є', 'ye');

    t.approximate('Ї', 'Ye');
    t.approximate('ї', 'ye');

    t.approximate('Ґ', 'G');
    t.approximate('ґ', 'g');
  });
}

export function correctPhoneFormat(phone) {
  if(!phone) {
    return null;
  }

  // Replace all not number characters (+380 98*** to 098***)
  phone = phone.replace(/[^\d]+/g, '');

  // Replace UA code (380*** to 0***)
  const UACodeRegExp = /^38/g;
  if(UACodeRegExp.test(phone)) {
    phone = phone.replace(/^38/g, '');
  }

  // Replace many first 0 (like 0098***)
  const first0RegExp = /^0{2,}/g;
  if(first0RegExp.test(phone)) {
    phone = phone.replace(first0RegExp, '0');
  }

  // Replace wrong format (like 8098***)
  const wrongFormatRegExp = /^80\d{9}/g;
  if(wrongFormatRegExp.test(phone)) {
    phone = phone.replace('8', '');
  }

  // Add 0 to start of phone (98*** to 098***)
  const withoutFirst0RegExp = /^[1-9]\d{8}/g;
  if(withoutFirst0RegExp.test(phone)) {
    phone = `0${phone}`;
  }

  if(phone.length < 10) {
    return null;
  }

  // Make format 3322 (like *** *** ** **)
  return phone.replace(/^([\d]{3})([\d]{3})([\d]{2})([\d]{2})/g, '$1 $2 $3 $4').substr(0, 13);
}

export async function detectGenderByName(name) {
  if(!name) {
    return 'Невідомо';
  }

  name = name.split(' ')[0];

  let gender = genderDetection.detect(name);

  if(gender === 'unknown') {
    gender = genderDetection.detect(Inflector.transliterate(name).replace(/\?/g, ''));
  }

  if(gender === 'unknown' && name.length > 3) {
    gender = await detectGenderByGenderizeApi(name);
  }

  switch (gender) {
    case 'male':
      return 'Чоловік';
    case 'female':
      return 'Жінка';
    default:
      return 'Невідомо';
  }
}

export function parsePeriodString(string) {
	const period = string.split(' ');
	return {value: period[0], part: period[1]};
}

const getSplittedKey = (key) => {
  let multiKey = key.split('.');
  let singleKey = multiKey.shift();

  return {singleKey, multiKey};
};

const getValueFromConf = (key, dbConf, config) => {
  let conf = dbConf ? dbConf.get('value') : config;

  if(key.multiKey.length > 0) {
    for(let k of key.multiKey) {
      conf = conf[k];
    }
  }

  return conf;
};

export function getConfigValue(key, db = true) {
  key = getSplittedKey(key);

  let dbConf = null;
  if(db) {
    return new Promise((resolve) => {
      ConfigRepository.getByKey(key.singleKey).then(dbConf => {
        resolve(getValueFromConf(key, dbConf, config[key.singleKey]));
      })
    })
  }

  return getValueFromConf(key, dbConf, config[key.singleKey]);
}

export async function getConfigValues(keys, db = true) {
  const singleKeys = [];
  const newKeys = [];
  for(let key of keys) {
    const splittedKey = getSplittedKey(key);
    singleKeys.push(splittedKey.singleKey);
    newKeys.push(splittedKey);
  }

  let dbConfigs = null;
  if(db) {
    dbConfigs = await ConfigRepository.getByKeys(singleKeys);
  }

  const values = [];
  for(let key of newKeys) {
    let dbConf = dbConfigs ? dbConfigs.find(conf => conf.key === key.singleKey) : null;
    values.push(getValueFromConf(key, dbConf, config[key.singleKey]));
  }

  return values;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isStatus200(res) {
  return res && res.status === 200;
}

export function getRandomInt(to) {
  return Math.floor(Math.random() * to) + 1;
}

export const urlRegExp =
  'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)';

export const phoneRegExp =
  '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$';
