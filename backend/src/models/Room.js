const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    trim: true,
  },
  floor: { type: Number, required: true },
  building: { type: String, trim: true, default: 'Main' },
  type: {
    type: String,
    enum: ['single', 'double', 'twin', 'suite', 'penthouse'],
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'housekeeping'],
    default: 'available',
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: 0,
  },
  maxGuests: { type: Number, required: true, default: 2 },
  amenities: [{ type: String }],
  images: [{ type: String }],
  // Active booking reference for tenant display
  currentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  currentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
}, { timestamps: true });

// Compound unique index — room numbers unique per hotel
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ hotelId: 1, type: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
