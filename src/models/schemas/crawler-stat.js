import {Schema} from 'mongoose';

export default new Schema({
  adverts: Number,
  runs: Number,
  failed: Number,
  avgMaxAdverts: Number,
  avgTimeExecution: Number
}, {_id : false});