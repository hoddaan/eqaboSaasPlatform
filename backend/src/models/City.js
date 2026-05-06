const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  timezone:  { type: String },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

citySchema.index({ countryId: 1, name: 1 });

module.exports = mongoose.model('City', citySchema);
