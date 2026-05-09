const Room        = require('../../models/Room');
const HallBooking = require('../../models/HallBooking');
const Booking = require('../../models/Booking');
const Guest   = require('../../models/Guest');
const User    = require('../../models/User');
const { Transaction, MaintenanceRequest, RestaurantOrder, Payroll,
        Asset, Liability, Expense, Invoice } = require('../../models/index');

// ── MAIN FINANCIAL DASHBOARD ──────────────────────────
exports.getDashboard = async (req, res) => {
  const hotelId    = req.hotelId;
  const today      = new Date(); today.setHours(0,0,0,0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart  = new Date(today.getFullYear(), 0, 1);

  const [roomStats, activeBookings, todayCheckIns, todayCheckOuts,
         openMaintenance, recentBookings, totalGuests, stayingGuests] = await Promise.all([
    Room.aggregate([{ $match:{ hotelId, isActive:true } }, { $group:{ _id:'$status', count:{ $sum:1 } } }]),
    Booking.countDocuments({ hotelId, status:'checked_in' }),
    Booking.countDocuments({ hotelId, status:'checked_in', actualCheckIn:{ $gte:today } }),
    Booking.countDocuments({ hotelId, status:'checked_out', actualCheckOut:{ $gte:today } }),
    MaintenanceRequest.countDocuments({ hotelId, status:{ $in:['open','assigned','in_progress'] } }),
    Booking.find({ hotelId }).populate('guestId','firstName lastName').populate('roomId','roomNumber type').sort({ createdAt:-1 }).limit(5),
    Guest.countDocuments({ hotelId }),
    Guest.countDocuments({ hotelId, currentBookingId:{ $ne:null } }),
  ]);

  const rooms = { total:0, available:0, occupied:0, reserved:0, maintenance:0 };
  roomStats.forEach(s => { rooms[s._id]=s.count; rooms.total+=s.count; });
  const occupancyRate = rooms.total>0 ? Math.round(((rooms.occupied+rooms.reserved)/rooms.total)*100) : 0;

  res.json({ success:true, data:{ rooms, occupancyRate, activeBookings, todayCheckIns, todayCheckOuts, openMaintenance, totalGuests, stayingGuests, recentBookings } });
};

// ── COMPREHENSIVE FINANCIAL REPORT ───────────────────
exports.getReport = async (req, res) => {
  const hotelId = req.hotelId;
  const { from, to, period = 'month' } = req.query;

  let startDate, endDate = new Date();
  endDate.setHours(23,59,59,999);

  if (from && to) {
    startDate = new Date(from); startDate.setHours(0,0,0,0);
    endDate   = new Date(to);   endDate.setHours(23,59,59,999);
  } else {
    const now = new Date();
    if (period === 'today')  { startDate = new Date(now); startDate.setHours(0,0,0,0); }
    else if (period === 'week')  { startDate = new Date(now); startDate.setDate(now.getDate()-7); }
    else if (period === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (period === 'quarter') { const q = Math.floor(now.getMonth()/3); startDate = new Date(now.getFullYear(), q*3, 1); }
    else if (period === 'year')  { startDate = new Date(now.getFullYear(), 0, 1); }
    else startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const dateFilter = { $gte: startDate, $lte: endDate };

  // ── REVENUE SOURCES ──
  const [checkedOutBookings, restaurantOrders, guestServices, expenses, payrolls, maintenanceCosts, hallBookings] = await Promise.all([
    // Hotel room revenue — from checked-out bookings (source of truth)
    Booking.find({ hotelId, status: 'checked_out',
      actualCheckOut: { $gte: startDate, $lte: endDate }
    }).lean(),
    // Also include checked_in bookings with payments in range
    // Restaurant revenue (paid orders)
    RestaurantOrder.find({ hotelId, status: 'paid', createdAt: dateFilter }).lean(),
    // Guest services revenue
    Guest.find({ hotelId, 'services.paid': true }).lean(),
    // Expenses
    Expense.find({ hotelId, date: dateFilter }).lean(),
    // Payroll (paid)
    Payroll.find({ hotelId, status: 'paid', paidAt: dateFilter }).lean(),
    // Maintenance actual costs
    MaintenanceRequest.find({ hotelId, status: 'completed', completedAt: dateFilter, actualCost: { $gt: 0 } }).lean(),
    // Hall rental revenue
    HallBooking.find({ hotelId, status: { $in: ['confirmed','in_use','completed'] }, startDate: dateFilter }).lean(),
  ]);

  // Hotel room revenue — sum booking totals
  let roomRevenue = checkedOutBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);

  // Also add guest payments made in date range (partial pays, advance pays)
  const guestsWithPayments = await Guest.find({ hotelId, 'payments.0': { $exists: true } }).lean();
  for (const g of guestsWithPayments) {
    for (const p of g.payments || []) {
      const pDate = new Date(p.paidAt || p.createdAt);
      if (pDate >= startDate && pDate <= endDate) {
        // Only count room nights portion to avoid double-counting with booking totalAmount
        if (p.roomNights > 0 && !checkedOutBookings.find(b => b.guestId && b.guestId.toString() === g._id.toString())) {
          roomRevenue += p.roomNights || 0;
        }
      }
    }
  }

  // Guest additional services revenue
  let serviceRevenue = 0;
  for (const g of guestServices) {
    for (const s of g.services || []) {
      if (s.paid) {
        const sDate = new Date(s.updatedAt || s.createdAt || new Date());
        if (sDate >= startDate && sDate <= endDate) {
          serviceRevenue += s.price || 0;
        }
      }
    }
  }

  // Restaurant by type
  const restaurantByType = { dine_in:0, room_service:0, takeaway:0 };
  let restaurantTotal = 0;
  for (const o of restaurantOrders) {
    restaurantTotal += o.totalAmount || 0;
    if (restaurantByType[o.type] !== undefined) restaurantByType[o.type] += o.totalAmount || 0;
  }

  // Hall revenue
  const hallRevenue = hallBookings.reduce((s, b) => s + (b.totalAmount||0), 0);

  // Total Revenue
  const totalRevenue = roomRevenue + serviceRevenue + restaurantTotal + hallRevenue;

  // ── EXPENSES ──
  const expenseByCategory = {};
  let totalExpenses = 0;
  for (const e of expenses) {
    totalExpenses += e.amount || 0;
    expenseByCategory[e.category] = (expenseByCategory[e.category]||0) + (e.amount||0);
  }

  // Payroll as expense
  const payrollTotal = payrolls.reduce((s, p) => s + (p.netPay||0), 0);
  totalExpenses += payrollTotal;
  expenseByCategory['salary'] = (expenseByCategory['salary']||0) + payrollTotal;

  // Maintenance costs as expense
  const maintenanceTotal = maintenanceCosts.reduce((s, m) => s + (m.actualCost||0), 0);
  totalExpenses += maintenanceTotal;
  expenseByCategory['maintenance'] = (expenseByCategory['maintenance']||0) + maintenanceTotal;

  // ── ASSETS & LIABILITIES ──
  const [assets, liabilities] = await Promise.all([
    Asset.find({ hotelId, isActive: true }).lean(),
    Liability.find({ hotelId }).lean(),
  ]);

  const totalAssets      = assets.reduce((s, a) => s + (a.value||0), 0);
  const totalLiabilities = liabilities.filter((l) => !l.isPaid).reduce((s, l) => s + (l.amount||0), 0);
  const netWorth         = totalAssets - totalLiabilities;

  // Monthly trend (last 6 months)
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d   = new Date();
    const ms  = new Date(d.getFullYear(), d.getMonth()-i, 1);
    const me  = new Date(d.getFullYear(), d.getMonth()-i+1, 0, 23, 59, 59);
    const [mRest, mGuest] = await Promise.all([
      RestaurantOrder.aggregate([{ $match:{ hotelId, status:'paid', createdAt:{ $gte:ms,$lte:me } } }, { $group:{ _id:null, total:{ $sum:'$totalAmount' } } }]),
      Expense.aggregate([{ $match:{ hotelId, date:{ $gte:ms,$lte:me } } }, { $group:{ _id:null, total:{ $sum:'$amount' } } }]),
    ]);
    trend.push({
      month: ms.toLocaleString('en',{ month:'short', year:'numeric' }),
      revenue: mRest[0]?.total || 0,
      expenses: mGuest[0]?.total || 0,
    });
  }

  res.json({ success: true, data: {
    period: { from: startDate, to: endDate, label: period },
    revenue: {
      total: totalRevenue,
      rooms: roomRevenue,
      services: serviceRevenue,
      restaurant: restaurantTotal,
      restaurantBreakdown: restaurantByType,
      halls: hallRevenue,
    },
    expenses: {
      total: totalExpenses,
      payroll: payrollTotal,
      maintenance: maintenanceTotal,
      other: totalExpenses - payrollTotal - maintenanceTotal,
      byCategory: expenseByCategory,
      items: expenses,
    },
    profit: totalRevenue - totalExpenses,
    profitMargin: totalRevenue > 0 ? +((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) : 0,
    balance: { assets: totalAssets, liabilities: totalLiabilities, netWorth },
    assets, liabilities,
    trend,
  }});
};

// ── ASSETS CRUD ───────────────────────────────────────
exports.getAssets     = async (req,res) => { const a = await Asset.find({ hotelId:req.hotelId }).sort({ category:1,name:1 }); res.json({ success:true, data:{ assets:a } }); };
exports.createAsset   = async (req,res) => { const a = await Asset.create({ ...req.body, hotelId:req.hotelId }); res.json({ success:true, data:{ asset:a } }); };
exports.updateAsset   = async (req,res) => { const a = await Asset.findOneAndUpdate({ _id:req.params.id,hotelId:req.hotelId },req.body,{ new:true }); res.json({ success:true, data:{ asset:a } }); };
exports.deleteAsset   = async (req,res) => { await Asset.findOneAndUpdate({ _id:req.params.id,hotelId:req.hotelId },{ isActive:false }); res.json({ success:true }); };

// ── LIABILITIES CRUD ─────────────────────────────────
exports.getLiabilities  = async (req,res) => { const l = await Liability.find({ hotelId:req.hotelId }).sort({ isPaid:1,dueDate:1 }); res.json({ success:true, data:{ liabilities:l } }); };
exports.createLiability = async (req,res) => { const l = await Liability.create({ ...req.body, hotelId:req.hotelId }); res.json({ success:true, data:{ liability:l } }); };
exports.updateLiability = async (req,res) => {
  const update = { ...req.body };
  if (req.body.isPaid) update.paidAt = new Date();
  const l = await Liability.findOneAndUpdate({ _id:req.params.id,hotelId:req.hotelId },update,{ new:true });
  res.json({ success:true, data:{ liability:l } });
};
exports.deleteLiability = async (req,res) => { await Liability.findOneAndDelete({ _id:req.params.id,hotelId:req.hotelId }); res.json({ success:true }); };

// ── EXPENSES CRUD ─────────────────────────────────────
exports.getExpenses   = async (req,res) => {
  const { from,to,category,source } = req.query;
  const filter = { hotelId:req.hotelId };
  if (category) filter.category = category;
  if (source)   filter.source   = source;
  if (from||to) { filter.date={}; if(from) filter.date.$gte=new Date(from); if(to) filter.date.$lte=new Date(to); }
  const e = await Expense.find(filter).populate('recordedBy','name').sort({ date:-1 }).limit(500);
  res.json({ success:true, data:{ expenses:e } });
};
exports.createExpense = async (req,res) => { const e = await Expense.create({ ...req.body, hotelId:req.hotelId, recordedBy:req.user._id }); res.json({ success:true, data:{ expense:e } }); };
exports.updateExpense = async (req,res) => { const e = await Expense.findOneAndUpdate({ _id:req.params.id,hotelId:req.hotelId },req.body,{ new:true }); res.json({ success:true, data:{ expense:e } }); };
exports.deleteExpense = async (req,res) => { await Expense.findOneAndDelete({ _id:req.params.id,hotelId:req.hotelId }); res.json({ success:true }); };
