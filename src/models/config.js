import {Schema, model} from 'mongoose';
import moment from "moment";
import {parsePeriodString, getConfigValue} from "../utils";

const ConfigSchema = new Schema({
  key: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed
  },
}, {
  collection: 'configs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'}
});
const Config = model('Config', ConfigSchema);

export default Config;