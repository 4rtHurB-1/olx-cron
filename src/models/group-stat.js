import mongoose from 'mongoose';
import config from '../config';

const GroupStatSchema = mongoose.Schema({
  group: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  new: Number,
}, {
  collection: 'group_stats',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'}
});

GroupStatSchema.virtual('demand').get(function() {
  return config.maxAdvPerGroups - this.total;
});


const GroupStat = mongoose.model('GroupStat', GroupStatSchema);

export default GroupStat;