import {Schema, model} from 'mongoose';
import moment from "moment";
import {getConfigValue} from "../utils";

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

GroupStatSchema.methods.getCurrentDemand = function() {
  const total = this.total;
  return new Promise(resolve => {
    getConfigValue(`group_demands.${this.name}`).then(maxDemand => {
      resolve(maxDemand - total)
    })
  });
}

GroupStatSchema.methods.getTotalDemand = function() {
  const total = this.total;
  return new Promise(resolve => {
    getConfigValue(`group_demands.${this.name}`).then(maxDemand => {
      resolve(maxDemand)
    })
  });
}

GroupStatSchema.methods.getFillPercentage = function() {
  const total = this.total;
  return new Promise(resolve => {
    this.getTotalDemand().then(demand => {
      resolve(total / demand * 100)
    })
  });
}

const assignSchemaObj = {};
for(let g = 1; g <= 9; g++) {
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

StatSchema.methods.getGroupsTotal = function() {
  return new Promise(async resolve => {
    const res = {
      total: 0,
      demand: 0,
    }

    for(let group of this.groups) {
      res.total += group.total;
      res.demand += await group.getCurrentDemand();
    }

    resolve(res);
  });
}

StatSchema.virtual('isExpire').get(function() {
  const {part, value} = parsePeriodString(this.period);

  if(part && value) {
    const expiredAt = moment(this.created_at).startOf('hour').add(value, part);
    return moment().isAfter(expiredAt);
  }

  return false;
});

const Stat = model('Stat', StatSchema);

export default Stat;