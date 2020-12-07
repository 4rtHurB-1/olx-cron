import {getSpreadsheet} from './factory';
import {getConfigValue} from "../utils";

const getConfig = () => {
    const configKey = process.env.TEST_SHEETS ? 'test_sheets' : 'sheets';
    return getConfigValue(`${configKey}.phone_check`, false);
}

export default getSpreadsheet(getConfig());