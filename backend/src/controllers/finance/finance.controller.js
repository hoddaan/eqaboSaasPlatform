const { Transaction, Invoice } = require('../../models/index');
const Booking = require('../../models/Booking');
const { RestaurantOrder } = require('../../models/index');

// ── Finance Report ─────────────────────────────────────
exports.getFinanceReport = async (req, res) => {
  const { period = 'month', from, to } = req.query;

  let startDate, endDate;
  const now = new Date();

  if (from && to) {
    startDate = new Date(from);
    endDate   = new Date(to);
  } else if (period === 'today') {
    startDate = new Date(now.setHours(0,0,0,0));
    endDate   = new Date();
  } else if (period === 'week') {
    startDate = new Date(now.setDate(now.getDate() - 7));
    endDate   = new Date();
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate   = new Date();
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate   = new Date();
  }

  const baseMatch = { hotelId: req.hotelId, createdAt: { $gte: startDate, $lte: endDate } };

  const [txnSummary, byType, dailyRevenue] = await Promise.all([
    Transaction.aggregate([
      { $match: baseMatch },
      { $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      }},
    ]),
    Transaction.aggregate([
      { $match: { ...baseMatch, type: 'payment' } },
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
      { $group: {
        _id: { $cond: [ { $gt: [{ $size: '$booking' }, 0] }, 'rooms', 'restaurant'] },
        total: { $sum: '$amount' },
      }},
    ]),
    Transaction.aggregate([
      { $match: { ...baseMatch, type: 'payment' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  const income   = txnSummary.find(t => t._id === 'payment')?.total || 0;
  const refunds  = Math.abs(txnSummary.find(t => t._id === 'refund')?.total || 0);
  const net      = income - refunds;

  res.json({
    success: true,
    data: {
      period,
      income,
      refunds,
      net,
      byType: byType.reduce((acc, t) => ({ ...acc, [t._id]: t.total }), {}),
      dailyRevenue,
    },
  });
};

// ── Transactions CRUD ──────────────────────────────────
exports.getTransactions = async (req, res) => {
  const { type, page = 1, limit = 50 } = req.query;
  const filter = { hotelId: req.hotelId };
  if (type) filter.type = type;
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('guestId', 'firstName lastName')
      .populate('processedByUserId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Transaction.countDocuments(filter),
  ]);
  res.json({ success: true, data: { transactions, total } });
};

exports.createTransaction = async (req, res) => {
  const txn = await Transaction.create({
    ...req.body,
    hotelId: req.hotelId,
    processedByUserId: req.user._id,
  });

  // Update booking paid amount if linked
  if (req.body.bookingId && req.body.type === 'payment') {
    await Booking.findByIdAndUpdate(req.body.bookingId, {
      $inc: { paidAmount: req.body.amount },
    });
  }

  res.status(201).json({ success: true, data: { txn } });
};

// ── Invoices CRUD ──────────────────────────────────────
exports.getInvoices = async (req, res) => {
  const { status, guestId } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status)  filter.status = status;
  if (guestId) filter.guestId = guestId;
  const invoices = await Invoice.find(filter)
    .populate('guestId', 'firstName lastName')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { invoices } });
};

exports.createInvoice = async (req, res) => {
  const invoice = await Invoice.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, data: { invoice } });
};

exports.updateInvoice = async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    req.body,
    { new: true }
  );
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: { invoice } });
};
