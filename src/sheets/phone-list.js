import config from "../config";
import {getSpreadsheet} from './factory';

const configKey = process.env.TEST_SHEETS ? 'test_sheets' : 'sheets';

export default getSpreadsheet(config[configKey].phone_list);