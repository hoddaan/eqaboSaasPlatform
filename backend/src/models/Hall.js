const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema({
  hotelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name:        { type: String, required: true, trim: true },
  code:        { type: String, trim: true },         // e.g. "HALL-A", "CONF-1"
  type:        { type: String, enum: ['conference','banquet','meeting','wedding','seminar','boardroom','other'], default: 'conference' },
  capacity:    { type: Number, required: true },     // max persons
  pricePerHour:{ type: Number, default: 0 },
  pricePerDay: { type: Number, required: true },
  floor:       { type: Number, default: 1 },
  building:    { type: String, default: 'Main' },
  description: { type: String },
  amenities:   [{ type: String }],                  // projector, AC, wifi, etc
  images:      [{ type: String }],
  status:      { type: String, enum: ['available','booked','maintenance'], default: 'available' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

hallSchema.index({ hotelId: 1, status: 1 });

module.exports = mongoose.model('Hall', hallSchema);
