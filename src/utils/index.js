import genderDetection from 'gender-detection';
import {transliterate} from 'inflected';

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

export function sumStats(stats) {
  return stats.reduce((totalStats, stat) => {
    return {
      total: totalStats.total + stat.total,
      demand: totalStats.demand + stat.demand
    }
  });
}

export const urlRegExp =
  'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)';

export const phoneRegExp =
  '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$';
