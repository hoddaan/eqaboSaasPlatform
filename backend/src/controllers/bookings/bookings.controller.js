const Booking = require('../../models/Booking');
const Room    = require('../../models/Room');
const Guest   = require('../../models/Guest');

// ── GET all bookings (with filters) ───────────────────
exports.getBookings = async (req, res) => {
  const { status, guestId, roomId, from, to, search, page = 1, limit = 50 } = req.query;

  const filter = { hotelId: req.hotelId };
  if (search)  filter.bookingRef = { $regex: search, $options: 'i' };
  if (status)  filter.status  = status;
  if (guestId) filter.guestId = guestId;
  if (roomId)  filter.roomId  = roomId;
  if (from || to) {
    filter.checkIn = {};
    if (from) filter.checkIn.$gte = new Date(from);
    if (to)   filter.checkIn.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('guestId', 'firstName lastName email phone')
      .populate('roomId', 'roomNumber type floor')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { bookings, total, page: Number(page), pages: Math.ceil(total / limit) },
  });
};

// ── GET single booking ─────────────────────────────────
exports.getBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, hotelId: req.hotelId })
    .populate('guestId')
    .populate('roomId')
    .populate('createdByUserId', 'name role');

  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  res.json({ success: true, data: { booking } });
};

// ── POST create booking ────────────────────────────────
exports.createBooking = async (req, res) => {
  const { roomId, guestId, checkIn, checkOut, adults, children, specialRequests, source,
          status: reqStatus, paymentMethod, documents, companions } = req.body;

  // Check room availability
  const conflicting = await Booking.findOne({
    roomId,
    hotelId: req.hotelId,
    status: { $in: ['reserved', 'checked_in'] },
    $or: [
      { checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } },
    ],
  });

  if (conflicting) {
    return res.status(400).json({ success: false, message: 'Room is not available for the selected dates' });
  }

  const room = await Room.findOne({ _id: roomId, hotelId: req.hotelId });
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const totalAmount = room.pricePerNight * nights;

  const bookingStatus = reqStatus === 'checked_in' ? 'checked_in' : 'reserved';

  const booking = await Booking.create({
    hotelId: req.hotelId,
    roomId,
    guestId,
    createdByUserId: req.user._id,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    nights,
    adults: adults || 1,
    children: children || 0,
    ratePerNight: room.pricePerNight,
    totalAmount,
    specialRequests,
    source: source || 'walk_in',
    status: bookingStatus,
    paymentMethod: paymentMethod || 'cash',
    documents: documents || [],
    companions: companions || [],
    actualCheckIn: bookingStatus === 'checked_in' ? new Date() : undefined,
  });

  // Update room status
  const roomStatus = bookingStatus === 'checked_in' ? 'occupied' : 'reserved';
  await Room.findByIdAndUpdate(roomId, {
    status: roomStatus,
    currentBookingId: bookingStatus === 'checked_in' ? booking._id : null,
  });

  // Link booking to guest profile
  await Guest.findByIdAndUpdate(guestId, {
    currentBookingId: booking._id,
    currentRoomId: roomId,
  });

  const populated = await Booking.findById(booking._id)
    .populate('guestId', 'firstName lastName email phone')
    .populate('roomId', 'roomNumber type floor');

  res.status(201).json({ success: true, message: 'Booking created', data: { booking: populated } });
};

// ── PATCH check-in ─────────────────────────────────────
exports.checkIn = async (req, res) => {
  const Room = require('../../models/Room');
  const booking = await Booking.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (booking.status !== 'reserved') {
    return res.status(400).json({ success: false, message: `Cannot check in: booking is ${booking.status}` });
  }

  booking.status = 'checked_in';
  booking.actualCheckIn = new Date();
  await booking.save();

  await Room.findByIdAndUpdate(booking.roomId, {
    status: 'occupied',
    currentBookingId: booking._id,
  });

  res.json({ success: true, message: 'Guest checked in', data: { booking } });
};

// ── PATCH check-out ────────────────────────────────────
exports.checkOut = async (req, res) => {
  const Room = require('../../models/Room');
  const booking = await Booking.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (booking.status !== 'checked_in') {
    return res.status(400).json({ success: false, message: `Cannot check out: booking is ${booking.status}` });
  }

  booking.status = 'checked_out';
  booking.actualCheckOut = new Date();
  await booking.save();

  await Room.findByIdAndUpdate(booking.roomId, {
    status: 'available',
    currentBookingId: null,
  });

  // Increment guest stats
  await Guest.findByIdAndUpdate(booking.guestId, {
    $inc: { totalStays: 1, totalSpend: booking.totalAmount },
  });

  res.json({ success: true, message: 'Guest checked out', data: { booking } });
};

// ── PATCH cancel booking ───────────────────────────────
exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (['checked_out', 'cancelled'].includes(booking.status)) {
    return res.status(400).json({ success: false, message: 'Booking cannot be cancelled' });
  }

  booking.status = 'cancelled';
  booking.cancellationReason = req.body.reason || '';
  booking.cancelledAt = new Date();
  await booking.save();

  if (['reserved', 'checked_in'].includes(booking.status)) {
    await Room.findByIdAndUpdate(booking.roomId, { status: 'available', currentBookingId: null });
  }

  res.json({ success: true, message: 'Booking cancelled', data: { booking } });
};

// ── GET availability check ─────────────────────────────
exports.checkAvailability = async (req, res) => {
  const { checkIn, checkOut, type } = req.query;

  const occupiedRoomIds = await Booking.distinct('roomId', {
    hotelId: req.hotelId,
    status: { $in: ['reserved', 'checked_in'] },
    checkIn:  { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  });

  const filter = {
    hotelId: req.hotelId,
    status: 'available',
    isActive: true,
    _id: { $nin: occupiedRoomIds },
  };
  if (type) filter.type = type;

  const rooms = await Room.find(filter).sort({ floor: 1, roomNumber: 1 });
  res.json({ success: true, data: { rooms, count: rooms.length } });
};

exports.updateBooking = async (req, res) => {
  const Booking = require('../../models/Booking');
  const Room = require('../../models/Room');
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false })
    .populate('guestId', 'firstName lastName email')
    .populate('roomId', 'roomNumber type floor');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  // Sync room + guest when booking status changes
  if (req.body.status === 'checked_in') {
    await Room.findByIdAndUpdate(booking.roomId, { status: 'occupied', currentBookingId: booking._id });
    await Guest.findByIdAndUpdate(booking.guestId, { currentBookingId: booking._id, currentRoomId: booking.roomId });
  }
  if (req.body.status === 'checked_out') {
    await Room.findByIdAndUpdate(booking.roomId, { status: 'available', currentBookingId: null });
    await Guest.findByIdAndUpdate(booking.guestId, { currentBookingId: null, currentRoomId: null });
  }
  if (req.body.status === 'cancelled') {
    await Room.findByIdAndUpdate(booking.roomId, { status: 'available', currentBookingId: null });
    await Guest.findByIdAndUpdate(booking.guestId, { currentBookingId: null, currentRoomId: null });
  }
  if (req.body.status === 'reserved') {
    await Room.findByIdAndUpdate(booking.roomId, { status: 'reserved', currentBookingId: null });
  }
  res.json({ success: true, message: 'Booking updated', data: { booking } });
};

exports.deleteBooking = async (req, res) => {
  const Booking = require('../../models/Booking');
  await Booking.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.json({ success: true, message: 'Booking cancelled' });
};
