import {Schema, model} from 'mongoose';
import moment from "moment";
import {getConfigValue, parsePeriodString} from "../utils";
import GroupStatSchema from "./schemas/group-stat";
import GroupAssignSchema from "./schemas/assign-stat";
import CrawlerStatSchema from "./schemas/crawler-stat";

const StatSchema = new Schema({
  period: {
    type: String,
    required: true
  },
  actual: {
    type: Boolean,
    required: true
  },

  groups: [GroupStatSchema],

  crawler: CrawlerStatSchema,

  check: new Schema({
    total: Number,
    uniq: Number,
  }, {_id : false}),

  assign: new Schema({
    total: Number,
    groups: GroupAssignSchema
  }, {_id : false}),
}, {
  collection: 'stats',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'}
});

StatSchema.virtual('groupsTotal').get(function() {
  const res = {
    total: 0,
    demand: 0
  };

  for(let group of this.groups) {
    res.total += group.total;
    res.demand += group.demand;
  }

  return res;
});

StatSchema.virtual('isExpire').get(function() {
  const {part, value} = parsePeriodString(this.period);

  if(part && value) {
    const expiredAt = moment(this.created_at).startOf('hour').add(value, part);
    return moment().isSameOrAfter(expiredAt);
  }

  return false;
});

const Stat = model('Stat', StatSchema);

export default Stat;