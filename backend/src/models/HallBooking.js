const mongoose = require('mongoose');

const hallBookingSchema = new mongoose.Schema({
  hotelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  hallId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hall',  required: true },
  guestId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

  bookingRef: { type: String, unique: true },

  // Event details
  eventName:  { type: String, required: true },
  eventType:  { type: String, enum: ['conference','wedding','birthday','seminar','meeting','training','dinner','other'], default: 'conference' },
  organizer:  { type: String },         // company or person name
  phone:      { type: String },
  email:      { type: String },
  attendees:  { type: Number, default: 1 },

  // Timing
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  startTime:  { type: String },         // "09:00"
  endTime:    { type: String },         // "18:00"
  days:       { type: Number, default: 1 },
  hours:      { type: Number, default: 8 },

  // Pricing
  pricePerDay:    { type: Number, required: true },
  pricePerHour:   { type: Number, default: 0 },
  billingMode:    { type: String, enum: ['per_day','per_hour'], default: 'per_day' },
  subtotal:       { type: Number, required: true },
  extraCharges:   [{ description: String, amount: Number }],
  discountAmount: { type: Number, default: 0 },
  taxRate:        { type: Number, default: 5 },
  taxAmount:      { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },
  paidAmount:     { type: Number, default: 0 },
  paymentStatus:  { type: String, enum: ['pending','partial','paid','refunded'], default: 'pending' },
  paymentMethod:  { type: String, enum: ['cash','card','bank_transfer','online'], default: 'cash' },

  status: { type: String, enum: ['reserved','confirmed','in_use','completed','cancelled'], default: 'reserved' },
  specialRequests: { type: String },
  notes:           { type: String },
  cancellationReason: { type: String },
}, { timestamps: true });

hallBookingSchema.pre('save', function(next) {
  if (this.isNew && !this.bookingRef) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rand  = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random()*chars.length)]).join('');
    const ymd   = new Date().toISOString().slice(2,10).replace(/-/g,'');
    this.bookingRef = `HB-${ymd}-${rand()}`;
  }
  next();
});

module.exports = mongoose.model('HallBooking', hallBookingSchema);
