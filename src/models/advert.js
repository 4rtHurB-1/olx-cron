import { Schema, model } from 'mongoose';

const AdvertSchema = new Schema({
  phone: String,
  url: String,
  username: String,
  pre_checked: Boolean,
  checked: Boolean,
  expired: {
    type: Boolean,
    default: false
  },
  locations: String,
  gender: String,
  assigned_to: String
}, {
  collection: 'adverts',
  timestamps: { updatedAt: 'updated_at', createdAt: 'created_at'}
});

const Advert = model('Advert', AdvertSchema);

export default Advert;