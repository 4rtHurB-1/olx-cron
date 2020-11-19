import mongoose, { Schema } from 'mongoose';

const AdvertSchema = new Schema({
  phone: String,
  url: String,
  username: String,
  checked: {
    type: Boolean,
    default: false
  },
  gender: String,
  assigned_to: String
}, {
  collection: 'adverts',
  timestamps: { updatedAt: 'updated_at'}
});

const Advert = mongoose.model('Advert', AdvertSchema);

export default Advert;