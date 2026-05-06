const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  firstName:   { type: String, required: true, trim: true },
  lastName:    { type: String, required: true, trim: true },
  email:       { type: String, lowercase: true, trim: true },
  phone:       { type: String, trim: true },
  nationality: { type: String, trim: true }, // ISO country code
  idType: {
    type: String,
    enum: ['passport', 'national_id', 'driving_license'],
  },
  idNumber: { type: String },
  dateOfBirth: { type: Date },
  vipTier: {
    type: String,
    enum: ['regular', 'silver', 'gold', 'vip'],
    default: 'regular',
  },
  totalStays: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  preferences: {
    floorPreference:      { type: String },
    roomType:             { type: String },
    dietaryRequirements:  { type: String },
    specialRequests:      { type: String },
  },
  notes: { type: String },
  // Service requests recorded during stay
  services: [{
    category:  { type: String },
    service:   { type: String },
    icon:      { type: String, default: '🛎' },
    note:      { type: String },
    price:     { type: Number, default: 0 },
    billing:   { type: String, enum: ['pay_now','checkout'], default: 'checkout' },
    paid:      { type: Boolean, default: false },
    status:    { type: String, enum: ['pending','in_progress','done'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  }],
  // Partial payments recorded during stay
  payments: [{
    amount:        { type: Number, default: 0 },
    method:        { type: String, default: 'cash' },
    note:          { type: String },
    roomNights:    { type: Number, default: 0 },
    servicesTotal: { type: Number, default: 0 },
    servicesPaid:  [{ type: String }],
    discount:      { type: Number, default: 0 },     // discount amount in $
    discountPct:   { type: Number, default: 0 },     // discount percentage
    receiptRef:    { type: String },
    paidAt:        { type: Date, default: Date.now },
  }],
  // Stay history (populated when guest checks out)
  stayHistory: [{
    bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    roomNumber:  { type: String },
    checkIn:     { type: Date },
    checkOut:    { type: Date },
    nights:      { type: Number },
    roomTotal:   { type: Number },
    servicesTotal:{ type: Number },
    totalPaid:   { type: Number },
    settledAt:   { type: Date },
  }],
  // Current stay linkage
  currentRoomId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room',    default: null },
  currentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  // Who they are visiting (if a visitor/companion, not primary guest)
  visitingGuestId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Guest',   default: null },
  visitPurpose:     { type: String }, // business, family, tourism, etc.
}, { timestamps: true });

guestSchema.index({ hotelId: 1, email: 1 });
guestSchema.index({ hotelId: 1, vipTier: 1 });

// Virtual: full name
guestSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Guest', guestSchema);
