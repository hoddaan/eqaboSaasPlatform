const User       = require('../../models/User');
const { Leave, Attendance, Payroll } = require('../../models/index');
const bcrypt     = require('bcryptjs');

// ── STAFF CRUD ─────────────────────────────────────────
exports.getStaff = async (req, res) => {
  const { department, role, search } = req.query;
  const filter = { hotelId: req.hotelId, isActive: true };
  if (department) filter.department = department;
  if (role)       filter.role = role;
  if (search)     filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }];

  const staff = await User.find(filter).select('-passwordHash -refreshToken').sort({ name: 1 });
  res.json({ success: true, data: { staff } });
};

exports.getOne = async (req, res) => {
  const member = await User.findOne({ _id: req.params.id, hotelId: req.hotelId }).select('-passwordHash -refreshToken');
  if (!member) return res.status(404).json({ success: false, message: 'Staff not found' });
  res.json({ success: true, data: { member } });
};

exports.createStaff = async (req, res) => {
  const { name, email, password, role, department, position, employeeId, salary, salaryType, joinDate, shiftType, daysOff, nationality, idNumber, phone, emergencyContact, address, notes } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password required' });

  const passwordHash = await bcrypt.hash(password, 12);
  const member = await User.create({
    hotelId: req.hotelId, companyId: req.user.companyId,
    name, email, passwordHash, role: role || 'Receptionist',
    department, position, employeeId, salary, salaryType,
    joinDate: joinDate ? new Date(joinDate) : new Date(),
    shiftType, daysOff, nationality, idNumber, phone,
    emergencyContact, address, notes,
  });

  const result = member.toObject();
  delete result.passwordHash;
  res.status(201).json({ success: true, message: 'Staff member created', data: { member: result } });
};

exports.updateStaff = async (req, res) => {
  const { password, ...rest } = req.body;
  const update = { ...rest };
  if (password) update.passwordHash = await bcrypt.hash(password, 12);

  const member = await User.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    update, { new: true }
  ).select('-passwordHash -refreshToken');

  if (!member) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Updated', data: { member } });
};

exports.deactivateStaff = async (req, res) => {
  await User.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, { isActive: false });
  res.json({ success: true, message: 'Staff member deactivated' });
};

// ── HR DASHBOARD ──────────────────────────────────────
exports.getDashboard = async (req, res) => {
  const [totalStaff, departments, pendingLeaves, todayAttendance] = await Promise.all([
    User.countDocuments({ hotelId: req.hotelId, isActive: true }),
    User.aggregate([
      { $match: { hotelId: req.hotelId, isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Leave.countDocuments({ hotelId: req.hotelId, status: 'pending' }),
    Attendance.find({ hotelId: req.hotelId, date: { $gte: new Date(new Date().setHours(0,0,0,0)) } }).populate('userId', 'name department'),
  ]);

  res.json({ success: true, data: { totalStaff, departments, pendingLeaves, todayPresent: todayAttendance.filter(a => a.status==='present').length, todayAbsent: todayAttendance.filter(a => a.status==='absent').length, todayAttendance } });
};

// ── LEAVE MANAGEMENT ─────────────────────────────────
exports.getLeaves = async (req, res) => {
  const { status, userId } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status) filter.status = status;
  if (userId) filter.userId = userId;

  const leaves = await Leave.find(filter)
    .populate('userId', 'name department position')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 }).limit(100);

  res.json({ success: true, data: { leaves } });
};

exports.createLeave = async (req, res) => {
  const { userId, type, startDate, endDate, reason } = req.body;
  const start = new Date(startDate), end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await Leave.create({ hotelId: req.hotelId, userId, type, startDate: start, endDate: end, days, reason });
  const populated = await Leave.findById(leave._id).populate('userId', 'name department');
  res.status(201).json({ success: true, message: 'Leave request submitted', data: { leave: populated } });
};

exports.updateLeave = async (req, res) => {
  const { status, notes } = req.body;
  const update = { status, notes };
  if (['approved','rejected'].includes(status)) { update.approvedBy = req.user._id; update.approvedAt = new Date(); }

  const leave = await Leave.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, update, { new: true })
    .populate('userId', 'name department').populate('approvedBy', 'name');
  res.json({ success: true, message: `Leave ${status}`, data: { leave } });
};

// ── ATTENDANCE ────────────────────────────────────────
exports.getAttendance = async (req, res) => {
  const { date, userId, month } = req.query;
  const filter = { hotelId: req.hotelId };
  if (userId) filter.userId = userId;
  if (date) {
    const d = new Date(date); d.setHours(0,0,0,0);
    filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  } else if (month) {
    const [y,m] = month.split('-');
    filter.date = { $gte: new Date(y, m-1, 1), $lt: new Date(y, m, 1) };
  }

  const records = await Attendance.find(filter).populate('userId', 'name department shiftType').sort({ date: -1 });
  res.json({ success: true, data: { records } });
};

exports.markAttendance = async (req, res) => {
  const { userId, date, status, checkIn, checkOut, notes } = req.body;
  const d = new Date(date); d.setHours(0,0,0,0);

  let hoursWorked = 0;
  if (checkIn && checkOut) {
    hoursWorked = +(( new Date(checkOut) - new Date(checkIn) ) / 3600000).toFixed(2);
  }

  const record = await Attendance.findOneAndUpdate(
    { hotelId: req.hotelId, userId, date: { $gte: d, $lt: new Date(d.getTime() + 86400000) } },
    { hotelId: req.hotelId, userId, date: d, status, checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined, hoursWorked, notes },
    { upsert: true, new: true }
  ).populate('userId', 'name department');

  res.json({ success: true, message: 'Attendance recorded', data: { record } });
};

exports.bulkAttendance = async (req, res) => {
  const { records } = req.body; // [{ userId, status, checkIn, checkOut }]
  const date = new Date(); date.setHours(0,0,0,0);

  const ops = records.map((r) => ({
    updateOne: {
      filter: { hotelId: req.hotelId, userId: r.userId, date: { $gte: date, $lt: new Date(date.getTime() + 86400000) } },
      update: { hotelId: req.hotelId, userId: r.userId, date, status: r.status, checkIn: r.checkIn ? new Date(r.checkIn) : undefined, checkOut: r.checkOut ? new Date(r.checkOut) : undefined },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);
  res.json({ success: true, message: 'Bulk attendance saved' });
};

// ── PAYROLL ───────────────────────────────────────────

exports.getPayroll = async (req, res) => {
  const { period, userId, status } = req.query;
  const filter = { hotelId: req.hotelId };
  if (period) filter.period = period;
  if (userId) filter.userId = userId;
  if (status) filter.status = status;

  const records = await Payroll.find(filter)
    .populate('userId', 'name department position salary salaryType')
    .populate('processedBy', 'name')
    .sort({ createdAt: -1 });

  const totalGross = records.reduce((s, r) => s + (r.grossPay||0), 0);
  const totalNet   = records.reduce((s, r) => s + (r.netPay||0), 0);

  res.json({ success: true, data: { records, totalGross, totalNet } });
};

exports.generatePayroll = async (req, res) => {
  const { period } = req.body; // "2024-05"
  if (!period) return res.status(400).json({ success: false, message: 'Period required (YYYY-MM)' });

  const [year, month] = period.split('-').map(Number);
  const staffList = await User.find({ hotelId: req.hotelId, isActive: true, role: { $ne: 'SuperAdmin' } })
    .select('name salary salaryType department');

  // Get attendance for the period
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0); // last day of month
  const daysInMonth = endDate.getDate();

  const attendanceRecords = await Attendance.find({
    hotelId: req.hotelId,
    date: { $gte: startDate, $lte: endDate },
  });

  const created = [];
  for (const member of staffList) {
    // Skip if already exists
    const exists = await Payroll.findOne({ hotelId: req.hotelId, userId: member._id, period });
    if (exists) continue;

    const memberAttendance = attendanceRecords.filter(a => a.userId.toString() === member._id.toString());
    const daysWorked = memberAttendance.filter(a => ['present','late','half_day'].includes(a.status)).length;
    const daysAbsent = memberAttendance.filter(a => a.status === 'absent').length;
    const totalHours = memberAttendance.reduce((s, a) => s + (a.hoursWorked||0), 0);
    const overtimeHours = Math.max(0, totalHours - (daysWorked * 8));

    const dailyRate = member.salaryType === 'monthly' ? (member.salary||0) / daysInMonth : (member.salary||0);
    const baseSalary = member.salaryType === 'monthly' ? (member.salary||0) : dailyRate * daysWorked;
    const overtimeRate = dailyRate / 8 * 1.5;
    const overtimePay  = +(overtimeHours * overtimeRate).toFixed(2);
    const grossPay = +(baseSalary + overtimePay).toFixed(2);
    const netPay   = grossPay; // deductions added manually

    const payroll = await Payroll.create({
      hotelId: req.hotelId, userId: member._id, period, month, year,
      baseSalary, salaryType: member.salaryType||'monthly',
      daysWorked, daysAbsent, overtimeHours: +overtimeHours.toFixed(2),
      overtimeRate: +overtimeRate.toFixed(2), overtimePay,
      bonuses: [], bonusTotal: 0, deductions: [], deductionTotal: 0,
      grossPay, netPay, status: 'draft', processedBy: req.user._id,
    });
    created.push(payroll);
  }

  res.json({ success: true, message: `Generated ${created.length} payroll record(s)`, data: { created: created.length } });
};

exports.updatePayroll = async (req, res) => {
  const { bonuses, deductions, overtimeHours, notes, status, paymentMethod, paidAt } = req.body;

  const record = await Payroll.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!record) return res.status(404).json({ success: false, message: 'Not found' });

  const update = { notes, status, paymentMethod };
  if (paidAt) update.paidAt = new Date(paidAt);
  if (status === 'paid' && !record.paidAt) update.paidAt = new Date();

  if (bonuses !== undefined) {
    update.bonuses = bonuses;
    update.bonusTotal = bonuses.reduce((s, b) => s + (b.amount||0), 0);
  }
  if (deductions !== undefined) {
    update.deductions = deductions;
    update.deductionTotal = deductions.reduce((s, d) => s + (d.amount||0), 0);
  }
  if (overtimeHours !== undefined) {
    update.overtimeHours = overtimeHours;
    update.overtimePay   = +(overtimeHours * record.overtimeRate).toFixed(2);
  }

  // Recalculate
  const bonus   = update.bonusTotal    ?? record.bonusTotal;
  const deduct  = update.deductionTotal ?? record.deductionTotal;
  const ovtPay  = update.overtimePay    ?? record.overtimePay;
  update.grossPay = +(record.baseSalary + ovtPay + bonus).toFixed(2);
  update.netPay   = +(update.grossPay - deduct).toFixed(2);

  const updated = await Payroll.findByIdAndUpdate(record._id, update, { new: true })
    .populate('userId', 'name department position')
    .populate('processedBy', 'name');

  res.json({ success: true, message: 'Payroll updated', data: { record: updated } });
};

exports.approvePayroll = async (req, res) => {
  const { ids } = req.body; // array of payroll ids
  await Payroll.updateMany(
    { _id: { $in: ids }, hotelId: req.hotelId, status: 'draft' },
    { status: 'approved', processedBy: req.user._id }
  );
  res.json({ success: true, message: `${ids.length} record(s) approved` });
};

exports.markPayrollPaid = async (req, res) => {
  const { ids, paymentMethod } = req.body;
  await Payroll.updateMany(
    { _id: { $in: ids }, hotelId: req.hotelId, status: 'approved' },
    { status: 'paid', paymentMethod: paymentMethod||'bank', paidAt: new Date() }
  );
  res.json({ success: true, message: `${ids.length} payroll(s) marked as paid` });
};
