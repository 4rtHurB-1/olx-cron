import {Schema} from 'mongoose';

const GroupStatSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  /**
   * Max needed count of adverts
   */
  demand: {
    type: Number,
    required: true
  },

  /**
   * Total adverts
   */
  total: {
    type: Number,
    required: true
  },

  new: Number,
}, {_id : false});

/**
 * Calculate max daily count of adverts
 *
 * Check if exists minFill and endDate
 *
 * Then check if fill percentage of group >= minFill
 * If true calculate max daily count
 * Else 0 (max daily count is disabled)
 *
 * Max daily count calculates by
 * number of day to maxDate and max daily fill and max count of adverts
 *
 * Max daily fill = (7 days - day to maxDate) / 7 days
 * Max daily count = Max daily fill * Max count of adverts
 */
/*GroupStatSchema.virtual('dailyMax').get(function() {
  const fill = this.total / this.max;

  if(_.isNumber(this.minFill) && this.endDate && fill >= this.minFill) {
    const dateDiff = moment(this.endDate).startOf('day')
        .diff(moment().startOf('day'), 'days');
    const maxDailyFill = (7 - dateDiff) / 7;



    return maxDailyFill * this.max;
  }

  return 0;
});*/

/**
 * Calculate demand count of adverts
 *
 * If exists max daily count of adverts, calculate demand from dailyMax
 * Else calculate demand from max count of adverts
 * Demand = Max - Total;
 */
/*GroupStatSchema.virtual('demand').get(function() {
  const max = this.dailyMax > 0 ? this.dailyMax : this.max;
  return max < this.total ? 0 : max - this.total;
});*/

export default GroupStatSchema;