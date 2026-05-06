const Room    = require('../../models/Room');
const Booking = require('../../models/Booking');
const Guest   = require('../../models/Guest');
const mongoose = require('mongoose');
const { Transaction, MaintenanceRequest, RestaurantOrder } = require('../../models/index');

exports.getDashboard = async (req, res) => {
  const hotelId  = req.hotelId;
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    roomStats,
    activeBookings,
    todayCheckIns,
    todayCheckOuts,
    monthRevenue,
    todayRevenue,
    openMaintenance,
    todayOrders,
    recentBookings,
  ] = await Promise.all([
    Room.aggregate([
      { $match: { hotelId, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.countDocuments({ hotelId, status: 'checked_in' }),
    Booking.countDocuments({ hotelId, status: 'checked_in', actualCheckIn: { $gte: today } }),
    Booking.countDocuments({ hotelId, status: 'checked_out', actualCheckOut: { $gte: today } }),
    Transaction.aggregate([
      { $match: { hotelId, type: 'payment', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { hotelId, type: 'payment', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    MaintenanceRequest.countDocuments({ hotelId, status: { $in: ['open', 'assigned', 'in_progress'] } }),
    RestaurantOrder.countDocuments({ hotelId, createdAt: { $gte: today } }),
    Booking.find({ hotelId })
      .populate('guestId', 'firstName lastName')
      .populate('roomId', 'roomNumber type')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const rooms = { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 };
  roomStats.forEach(s => { rooms[s._id] = s.count; rooms.total += s.count; });
  const occupancyRate = rooms.total > 0
    ? Math.round(((rooms.occupied + rooms.reserved) / rooms.total) * 100)
    : 0;

  const [totalGuests, stayingGuests] = await Promise.all([
    Guest.countDocuments({ hotelId }),
    Guest.countDocuments({ hotelId, currentBookingId: { $ne: null } }),
  ]);

  res.json({
    success: true,
    data: {
      rooms,
      occupancyRate,
      activeBookings,
      todayCheckIns,
      todayCheckOuts,
      monthRevenue: monthRevenue[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      openMaintenance,
      todayOrders,
      recentBookings,
      totalGuests,
      stayingGuests,
    },
  });
};
