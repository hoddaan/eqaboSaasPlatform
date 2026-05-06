// ── rooms.controller.js ────────────────────────────────
const Room = require('../../models/Room');

exports.getRooms = async (req, res) => {
  const { status, type, floor, hotelId } = req.query;
  const targetHotelId = hotelId || req.hotelId;
  const filter = { isActive: true };
  if (targetHotelId) filter.hotelId = targetHotelId;
  if (status) filter.status = status;
  if (type)   filter.type   = type;
  if (floor)  filter.floor  = Number(floor);
  const rooms = await Room.find(filter)
    .populate({
      path: 'currentBookingId',
      select: 'bookingRef guestId checkIn checkOut nights adults',
      populate: { path: 'guestId', select: 'firstName lastName phone email vipTier' },
    })
    .sort({ floor: 1, roomNumber: 1 });
  res.json({ success: true, data: { rooms } });
};

exports.getRoom = async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  res.json({ success: true, data: { room } });
};

exports.createRoom = async (req, res) => {
  const room = await Room.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, message: 'Room created', data: { room } });
};

exports.updateRoom = async (req, res) => {
  const room = await Room.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  res.json({ success: true, message: 'Room updated', data: { room } });
};

exports.deleteRoom = async (req, res) => {
  // Hard delete — soft delete (isActive:false) blocks re-creation due to unique index
  const room = await Room.findOneAndDelete({ _id: req.params.id });
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  res.json({ success: true, message: 'Room deleted' });
};

exports.getRoomStats = async (req, res) => {
  const stats = await Room.aggregate([
    { $match: { hotelId: req.hotelId, isActive: true } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const result = { available: 0, occupied: 0, reserved: 0, maintenance: 0, housekeeping: 0, total: 0 };
  stats.forEach(s => { result[s._id] = s.count; result.total += s.count; });
  res.json({ success: true, data: result });
};

module.exports.Rooms = module.exports;
