import {Schema, model} from 'mongoose';

const ConfigSchema = new Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: Schema.Types.Mixed
  },
}, {
  collection: 'configs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'}
});
const Config = model('Config', ConfigSchema);

export default Config;