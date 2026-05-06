const mongoose = require('mongoose');

const partnerPaymentSchema = new mongoose.Schema({
  hotelId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  partnerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  guestId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' },
  bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  guestName:    { type: String },
  bookingRef:   { type: String },
  roomNumber:   { type: String },
  items:        [{ label: String, amount: Number }],
  totalAmount:  { type: Number, required: true },
  status:       { type: String, enum: ['pending','sent','paid'], default: 'pending' },
  receiptRef:   { type: String },
  sentAt:       { type: Date },
  paidAt:       { type: Date },
  notes:        { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PartnerPayment', partnerPaymentSchema);
