import genderDetection from 'gender-detection';
import {transliterate} from 'inflected';
import config from '../config';

import ConfigRepository from '../repositories/config';

export function correctPhoneFormat(phone) {
  // Replace all not number characters (+380 98*** to 098***)
  phone = phone.replace(/[^\d]+/g, '');

  // Replace UA code (380*** to 0***)
  const UACodeRegExp = /^380/g;
  if(UACodeRegExp.test(phone)) {
    phone = phone.replace(/^38/g, '');
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

export function detectGenderByName(name) {
  if(!name) {
    return 'Невідомо';
  }

  name = name.split(' ')[0];

  let gender = genderDetection.detect(name);

  if(gender === 'unknown') {
    name = transliterate(name.replace(/ъ|ь|Ъ|Ь/gm, ''));
  }

  gender = genderDetection.detect(name);

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
  let conf = dbConf ? dbConf : config;

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

export const urlRegExp =
  'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)';

export const phoneRegExp =
  '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$';
