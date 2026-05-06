const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookingRef: {
    type: String,
    unique: true,
  },
  checkIn:  { type: Date, required: true },
  checkOut: { type: Date, required: true },
  actualCheckIn:  { type: Date },
  actualCheckOut: { type: Date },
  nights: { type: Number, required: true },
  adults:   { type: Number, required: true, default: 1 },
  children: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['reserved', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'reserved',
  },
  ratePerNight:  { type: Number, required: true },
  totalAmount:   { type: Number, required: true },
  paidAmount:    { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending',
  },
  specialRequests: { type: String },
  source: {
    type: String,
    enum: ['walk_in', 'phone', 'online', 'superadmin', 'other'],
    default: 'walk_in',
  },
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  paymentMethod: { type: String, enum: ['cash','visa','mastercard','bank_transfer','online'], default: 'cash' },
  // Guest documents uploaded at check-in
  documents: [{
    type:    { type: String }, // passport, national_id, visa, etc
    label:   { type: String },
    url:     { type: String }, // base64 or CDN url
  }],
  // Extra guests sharing the room
  companions: [{
    name:       { type: String },
    idType:     { type: String },
    idNumber:   { type: String },
    relation:   { type: String }, // spouse, child, colleague
  }],
}, { timestamps: true });

// Indexes
bookingSchema.index({ hotelId: 1, status: 1 });
bookingSchema.index({ hotelId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guestId: 1 });
bookingSchema.index({ roomId: 1, status: 1 });

// Auto-generate unique booking reference
bookingSchema.pre('save', function (next) {
  if (this.isNew && !this.bookingRef) {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingRef = `BK-${ts}-${rnd}`;
  }
  // Compute nights
  if (this.checkIn && this.checkOut) {
    const diff = this.checkOut - this.checkIn;
    this.nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
