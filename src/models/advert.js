import { Schema, model } from 'mongoose';

const AdvertSchema = new Schema({
  phone: String,
  url: String,
  username: String,
  pre_checked: {
    type: Boolean,
    default: false
  },
  checked: {
    type: Boolean,
    default: false
  },
  expired: {
    type: Boolean,
    default: false
  },
  locations: String,
  gender: String,
  assigned_to: String
}, {
  collection: 'adverts',
  timestamps: { updatedAt: 'updated_at'}
});

const Advert = model('Advert', AdvertSchema);

export default Advert;