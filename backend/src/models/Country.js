const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  code:     { type: String, required: true, uppercase: true, trim: true, maxlength: 3 }, // ISO 3166-1 e.g. AE, GB
  currency: { type: String, default: 'USD', uppercase: true },
  timezone: { type: String, default: 'UTC' },
  flag:     { type: String }, // emoji or URL
  isActive: { type: Boolean, default: true },
  createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

countrySchema.index({ code: 1 }, { unique: true });
countrySchema.index({ name: 1 });

module.exports = mongoose.model('Country', countrySchema);
