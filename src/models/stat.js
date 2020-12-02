import {Schema, model} from 'mongoose';
import config from '../config';
import moment from "moment";

const GroupStatSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  new: Number,
}, {_id : false});

GroupStatSchema.virtual('demand').get(function() {
  return config.maxAdvPerGroups - this.total;
});

const assignSchemaObj = {};
for(let g = 1; g <= config.groups; g++) {
  assignSchemaObj[`group${g}`] = Number;
}
const GroupAssignSchema = new Schema(assignSchemaObj, {_id : false});

const AssignStatSchema = new Schema({
  total: Number,
  groups: GroupAssignSchema
}, {_id : false});


const StatSchema = new Schema({
  type: {
    type: String,
    required: true
  },
  period: {
    type: String,
    required: true
  },
  actual: {
    type: Boolean,
    required: true
  },

  groups: [GroupStatSchema],

  crawler: new Schema({
    adverts: Number,
    runs: Number,
    failed: Number,
    avgMaxAdverts: Number,
    avgTimeExecution: Number
  }, {_id : false}),

  check: new Schema({
    total: Number,
    uniq: Number,
  }, {_id : false}),

  assign: AssignStatSchema,
}, {
  collection: 'stats',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'}
});

StatSchema.virtual('groupsTotal').get(function() {
  return this.groups.reduce((totalStats, stat) => {
    return {
      total: totalStats.total + stat.total,
      demand: totalStats.demand + stat.demand
    }
  });
});

StatSchema.virtual('isExpire').get(function() {
    let periods = this.period.split(' ');
    if(periods.length && periods[0] && !isNaN(periods[0]) && typeof periods[1] === 'string') {
      const expiredAt = moment(this.created_at).startOf('hour').add(parseInt(periods[0]), periods[1]);
      return moment().isAfter(expiredAt);
    }

    return false;
});

const Stat = model('Stat', StatSchema);

export default Stat;