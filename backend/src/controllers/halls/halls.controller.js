const Hall        = require('../../models/Hall');
const HallBooking = require('../../models/HallBooking');

// ── HALLS CRUD ────────────────────────────────────────
exports.getHalls = async (req, res) => {
  const halls = await Hall.find({ hotelId: req.hotelId, isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: { halls } });
};
exports.createHall = async (req, res) => {
  const hall = await Hall.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, data: { hall } });
};
exports.updateHall = async (req, res) => {
  const hall = await Hall.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true });
  res.json({ success: true, data: { hall } });
};
exports.deleteHall = async (req, res) => {
  await Hall.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, { isActive: false });
  res.json({ success: true });
};

// ── BOOKINGS ──────────────────────────────────────────
exports.getBookings = async (req, res) => {
  const { status, from, to, hallId } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status) filter.status = status;
  if (hallId) filter.hallId = hallId;
  if (from || to) { filter.startDate = {}; if (from) filter.startDate.$gte = new Date(from); if (to) filter.startDate.$lte = new Date(to); }
  const bookings = await HallBooking.find(filter)
    .populate('hallId','name type capacity pricePerDay')
    .populate('guestId','firstName lastName phone')
    .populate('createdBy','name')
    .sort({ startDate: -1 }).limit(300);
  res.json({ success: true, data: { bookings } });
};

exports.getBooking = async (req, res) => {
  const b = await HallBooking.findOne({ _id: req.params.id, hotelId: req.hotelId })
    .populate('hallId','name type capacity pricePerDay pricePerHour amenities')
    .populate('guestId','firstName lastName phone email')
    .populate('createdBy','name');
  if (!b) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: { booking: b } });
};

exports.createBooking = async (req, res) => {
  // Helper: parse date string as noon UTC to avoid timezone boundary issues
  const parseDate = (d) => { if (!d) return null; const [y,m,dy] = d.split('T')[0].split('-').map(Number); return new Date(Date.UTC(y,m-1,dy,12,0,0)); };

  const { hallId, startDate, endDate, billingMode, days, hours,
          pricePerDay, pricePerHour, taxRate = 5, discountAmount = 0, extraCharges = [] } = req.body;

  const conflict = await HallBooking.findOne({
    hotelId: req.hotelId, hallId,
    status: { $in: ['reserved','confirmed','in_use'] },
    startDate: { $lte: parseDate(endDate) },
    endDate:   { $gte: parseDate(startDate) },
  });
  if (conflict) return res.status(400).json({ success: false, message: 'Hall already booked for these dates: ' + conflict.bookingRef });

  const baseAmount  = billingMode === 'per_hour' ? (pricePerHour * hours) : (pricePerDay * days);
  const extrasTotal = extraCharges.reduce((s, e) => s + (e.amount||0), 0);
  const subtotal    = baseAmount + extrasTotal;
  const taxAmount   = +(subtotal * taxRate / 100).toFixed(2);
  const totalAmount = +(subtotal + taxAmount - discountAmount).toFixed(2);

  const booking = await HallBooking.create({
    ...req.body, hotelId: req.hotelId, createdBy: req.user._id,
    subtotal, taxAmount, totalAmount,
  });

  // Mark hall booked if starts today
  const today = new Date(); today.setHours(0,0,0,0);
  const start = parseDate(startDate) || new Date(startDate);
  if (start.getTime() === today.getTime()) await Hall.findByIdAndUpdate(hallId, { status: 'booked' });

  const populated = await HallBooking.findById(booking._id)
    .populate('hallId','name type capacity').populate('guestId','firstName lastName');
  res.status(201).json({ success: true, data: { booking: populated } });
};

exports.updateBooking = async (req, res) => {
  const b = await HallBooking.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true }
  ).populate('hallId','name type capacity').populate('guestId','firstName lastName');
  if (!b) return res.status(404).json({ success: false, message: 'Not found' });
  if (['completed','cancelled'].includes(req.body.status)) await Hall.findByIdAndUpdate(b.hallId, { status: 'available' });
  res.json({ success: true, data: { booking: b } });
};

exports.cancelBooking = async (req, res) => {
  const b = await HallBooking.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { status: 'cancelled', cancellationReason: req.body.reason || '' }, { new: true }
  );
  if (!b) return res.status(404).json({ success: false, message: 'Not found' });
  await Hall.findByIdAndUpdate(b.hallId, { status: 'available' });
  res.json({ success: true });
};

exports.getDashboard = async (req, res) => {
  const today      = new Date(); today.setHours(0,0,0,0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [halls, allBookings, monthBookings, todayBookings] = await Promise.all([
    Hall.find({ hotelId: req.hotelId, isActive: true }),
    HallBooking.find({ hotelId: req.hotelId }).lean(),
    HallBooking.find({ hotelId: req.hotelId, startDate: { $gte: monthStart } }).lean(),
    HallBooking.find({ hotelId: req.hotelId, startDate: { $lte: new Date(today.getTime()+86400000), $gte: today }, status: { $in: ['reserved','confirmed','in_use'] } }).populate('hallId','name type').lean(),
  ]);
  const monthRevenue = monthBookings.filter(b => b.status !== 'cancelled').reduce((s,b)=>s+b.totalAmount,0);
  const totalRevenue = allBookings.filter(b => b.status !== 'cancelled').reduce((s,b)=>s+b.totalAmount,0);
  res.json({ success: true, data: { halls, todayBookings, monthRevenue, totalRevenue, totalHalls: halls.length, activeBookings: allBookings.filter(b=>['reserved','confirmed','in_use'].includes(b.status)).length } });
};

// ── UPLOAD HALL IMAGES ────────────────────────────────
exports.uploadImages = async (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
  const urls = req.files.map(f => `/uploads/halls/${f.filename}`);
  const hall = await Hall.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { $push: { images: { $each: urls } } },
    { new: true }
  );
  res.json({ success: true, data: { urls, hall } });
};
