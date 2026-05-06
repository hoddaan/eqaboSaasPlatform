const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  hotelId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  companyName:   { type: String, required: true },
  contactName:   { type: String },
  contactEmail:  { type: String, required: true },
  contactPhone:  { type: String },
  address:       { type: String },
  taxId:         { type: String },
  creditLimit:   { type: Number, default: 0 },   // 0 = no limit
  notes:         { type: String },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
