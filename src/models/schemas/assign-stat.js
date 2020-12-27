import {Schema} from 'mongoose';
import {getConfigValue} from "../../utils";

const assignSchemaObj = {};
for(let g = 1; g <= 9; g++) {
  assignSchemaObj[`group${g}`] = Number;
}

export default new Schema(assignSchemaObj, {_id : false});