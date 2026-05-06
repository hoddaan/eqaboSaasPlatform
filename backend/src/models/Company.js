const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  countryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  cityId:       { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  address:      { type: String },
  contactEmail: { type: String, lowercase: true, trim: true },
  contactPhone: { type: String },
  logoUrl:      { type: String },
  isActive:   { type: Boolean, default: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // SuperAdmin who created it
  // The Company Admin user (set after user creation)
  adminUserId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

companySchema.index({ slug: 1 }, { unique: true });
companySchema.index({ countryId: 1 });
companySchema.index({ isActive: 1 });

companySchema.pre('validate', function (next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('Company', companySchema);
