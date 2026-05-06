const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
  },
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  country:  { type: String }, // ISO code snapshot
  city:     { type: String },
  timezone: { type: String, required: true, default: 'UTC' },
  currency: { type: String, required: true, default: 'USD', uppercase: true },
  isActive: { type: Boolean, default: true },
  logoUrl:  { type: String },
  propertyType: {
    type: String,
    enum: ['hotel', 'resort', 'villa', 'hostel'],
    default: 'hotel',
  },
  floors: { type: Number, default: 1, min: 1 },
  // Which modules are enabled for this hotel
  services: {
    type: [String],
    enum: ['hotel', 'restaurant', 'coffee'],
    default: ['hotel', 'restaurant', 'coffee'],
  },
  address:  {
    street: String, city: String, postcode: String, country: String,
  },
  contactEmail: { type: String, lowercase: true, trim: true },
  contactPhone: { type: String },
  taxRate:      { type: Number, default: 5 },
}, { timestamps: true });

hotelSchema.index({ companyId: 1 });
hotelSchema.index({ countryId: 1 });
hotelSchema.index({ cityId: 1 });

hotelSchema.pre('validate', function (next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

module.exports = mongoose.model('Hotel', hotelSchema);
