const Guest   = require('../../models/Guest');
const Room    = require('../../models/Room');
const Booking = require('../../models/Booking');

const populate = [
  { path: 'currentRoomId',    select: 'roomNumber type floor status pricePerNight' },
  { path: 'currentBookingId', select: 'bookingRef checkIn checkOut nights ratePerNight totalAmount status', populate: { path: 'roomId', select: 'roomNumber type floor' } },
  { path: 'visitingGuestId',  select: 'firstName lastName' },
];

// ── GET all ───────────────────────────────────────────
exports.getGuests = async (req, res) => {
  const { vipTier, search, history, page = 1, limit = 100 } = req.query;
  const filter = {};
  if (req.hotelId) filter.hotelId = req.hotelId;
  if (vipTier) filter.vipTier = vipTier;
  // history=true → checked-out guests (no active booking, has stayHistory)
  if (history === 'true') {
    filter.currentBookingId = null;
    filter['stayHistory.0'] = { $exists: true };
  } else if (history === 'false') {
    // active only
    filter.$or = [{ currentBookingId: { $ne: null } }, { visitingGuestId: { $ne: null } }];
  }
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ];
  }
  const guests = await Guest.find(filter).populate(populate).sort({ createdAt: -1 }).limit(Number(limit));
  const total  = await Guest.countDocuments(filter);
  res.json({ success: true, data: { guests, total } });
};

// ── GET one ───────────────────────────────────────────
exports.getGuest = async (req, res) => {
  const guest = await Guest.findById(req.params.id).populate(populate);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });
  res.json({ success: true, data: { guest } });
};

// ── POST create ───────────────────────────────────────
exports.createGuest = async (req, res) => {
  const guest = await Guest.create({ ...req.body, hotelId: req.hotelId || req.body.hotelId });
  res.status(201).json({ success: true, message: 'Guest created', data: { guest } });
};

// ── PUT update ────────────────────────────────────────
exports.updateGuest = async (req, res) => {
  const guest = await Guest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false }).populate(populate);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });
  res.json({ success: true, message: 'Guest updated', data: { guest } });
};

// ── DELETE ────────────────────────────────────────────
exports.deleteGuest = async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });
  if (guest.currentRoomId) {
    await Room.findByIdAndUpdate(guest.currentRoomId, { status: 'available', currentBookingId: null });
  }
  await Booking.updateMany(
    { guestId: guest._id, status: { $in: ['reserved', 'checked_in'] } },
    { status: 'cancelled', cancellationReason: 'Guest record deleted' }
  );
  await Guest.updateMany({ visitingGuestId: guest._id }, { visitingGuestId: null, visitPurpose: null });
  await guest.deleteOne();
  res.json({ success: true, message: 'Guest deleted' });
};

// ── POST add service ──────────────────────────────────
exports.addService = async (req, res) => {
  const guest = await Guest.findByIdAndUpdate(
    req.params.id,
    { $push: { services: { ...req.body, createdAt: new Date() } } },
    { new: true, runValidators: false }
  ).populate(populate);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });
  res.json({ success: true, data: { guest } });
};

// ── PUT update service ────────────────────────────────
exports.updateService = async (req, res) => {
  const { id, sid } = req.params;
  const update = {};
  Object.keys(req.body).forEach(k => { update[`services.$.${k}`] = req.body[k]; });
  const guest = await Guest.findOneAndUpdate(
    { _id: id, 'services._id': sid },
    { $set: update },
    { new: true }
  ).populate(populate);
  if (!guest) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: { guest } });
};

// ── DELETE remove service ─────────────────────────────
exports.removeService = async (req, res) => {
  const guest = await Guest.findByIdAndUpdate(
    req.params.id,
    { $pull: { services: { _id: req.params.sid } } },
    { new: true }
  ).populate(populate);
  res.json({ success: true, data: { guest } });
};

// ── POST record partial payment ───────────────────────
exports.recordPayment = async (req, res) => {
  const { serviceIds = [], includeRoom = false, paymentMethod = 'cash', amount = 0, discount = 0 } = req.body;
  const guest = await Guest.findById(req.params.id).populate('currentBookingId').populate('currentRoomId', 'roomNumber');
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

  const booking = guest.currentBookingId;
  const roomAmount = includeRoom ? (booking?.ratePerNight || 0) * (booking?.nights || 0) : 0;

  // Mark specified services as paid
  let svcAmount = 0;
  const paidSvcNames = [];
  if (serviceIds.length) {
    const svcs = (guest.services || []).filter(s => serviceIds.includes(String(s._id)));
    svcAmount = svcs.reduce((sum, s) => sum + (s.price || 0), 0);
    svcs.forEach(s => paidSvcNames.push({ icon: s.icon, service: s.service, price: s.price }));
    await Guest.updateOne(
      { _id: guest._id },
      { $set: { 'services.$[elem].paid': true } },
      { arrayFilters: [{ 'elem._id': { $in: serviceIds } }] }
    );
  }

  const preDiscount = roomAmount + svcAmount;
  const discountAmt = Math.min(discount || 0, preDiscount);
  const totalPaid   = preDiscount - discountAmt;
  const discountPct = preDiscount > 0 ? Math.round((discountAmt / preDiscount) * 100) : 0;
  const receiptRef  = `PAY-${Date.now().toString(36).toUpperCase()}`;

  // Record the payment
  await Guest.findByIdAndUpdate(guest._id, {
    $push: {
      payments: {
        amount:        totalPaid,
        method:        paymentMethod,
        roomNights:    roomAmount,
        servicesTotal: svcAmount,
        servicesPaid:  serviceIds,
        discount:      discountAmt,
        discountPct,
        receiptRef,
        paidAt:        new Date(),
      },
    },
  });

  // Build receipt
  const receipt = {
    receiptRef,
    guestName:  `${guest.firstName} ${guest.lastName}`,
    roomNumber: guest.currentRoomId?.roomNumber,
    bookingRef: booking?.bookingRef,
    roomAmount,
    services:   paidSvcNames,
    svcAmount,
    totalPaid,
    paymentMethod,
    paidAt:     new Date(),
    type:       'partial',
  };

  const updated = await Guest.findById(guest._id).populate('currentBookingId').populate('currentRoomId', 'roomNumber type floor pricePerNight');
  res.json({ success: true, message: 'Payment recorded', data: { receipt, guest: updated } });
};

// ── POST checkout with receipt ────────────────────────
exports.checkoutGuest = async (req, res) => {
  const { paymentMethod = 'cash', paidServices = [], payRoomNights = true } = req.body;
  const guest = await Guest.findById(req.params.id).populate(populate);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

  const booking = guest.currentBookingId;
  const room    = guest.currentRoomId;

  // Calculate totals
  const roomTotal     = booking ? (booking.ratePerNight || 0) * (booking.nights || 0) : 0;
  const unpaidSvcs    = (guest.services || []).filter(s => s.billing === 'checkout' && !s.paid);
  const servicesTotal = unpaidSvcs.reduce((s, sv) => s + (sv.price || 0), 0);
  const totalDue      = (payRoomNights ? roomTotal : 0) + servicesTotal;

  // Mark all checkout services as paid
  await Guest.updateOne(
    { _id: guest._id },
    { $set: { 'services.$[elem].paid': true } },
    { arrayFilters: [{ 'elem.billing': 'checkout' }], strict: false }
  );

  // Move stay to history
  const historyEntry = {
    bookingId:     booking?._id,
    roomNumber:    room?.roomNumber || booking?.roomId?.roomNumber,
    checkIn:       booking?.checkIn,
    checkOut:      new Date(),
    nights:        booking?.nights,
    roomTotal,
    servicesTotal,
    totalPaid:     totalDue,
    settledAt:     new Date(),
  };

  // Update guest: clear active stay, add history, increment stats
  await Guest.findByIdAndUpdate(guest._id, {
    currentBookingId: null,
    currentRoomId:    null,
    visitingGuestId:  null,
    $push:  { stayHistory: historyEntry },
    $inc:   { totalStays: 1, totalSpend: totalDue },
  });

  // Free the room
  if (room?._id) {
    await Room.findByIdAndUpdate(room._id, { status: 'available', currentBookingId: null });
  }

  // Update booking status
  if (booking?._id) {
    await Booking.findByIdAndUpdate(booking._id, {
      status: 'checked_out',
      actualCheckOut: new Date(),
      paidAmount: totalDue,
    });
  }

  // Build receipt
  const receipt = {
    guestName:      `${guest.firstName} ${guest.lastName}`,
    bookingRef:     booking?.bookingRef,
    roomNumber:     room?.roomNumber || booking?.roomId?.roomNumber,
    checkIn:        booking?.checkIn,
    checkOut:       new Date(),
    nights:         booking?.nights,
    ratePerNight:   booking?.ratePerNight,
    roomTotal,
    services:       unpaidSvcs.map(s => ({ service: s.service, icon: s.icon, price: s.price })),
    servicesTotal,
    totalDue,
    paymentMethod,
    settledAt:      new Date(),
  };

  res.json({ success: true, message: 'Guest checked out', data: { receipt } });
};
