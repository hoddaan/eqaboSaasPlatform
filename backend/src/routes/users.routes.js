const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect, authorize, tenantScope } = require('../middleware/auth');

const mgmt = [protect, authorize('SuperAdmin', 'CompanyAdmin', 'HotelAdmin', 'Manager'), tenantScope];
const SA_CA = [protect, authorize('SuperAdmin', 'CompanyAdmin'), tenantScope];

// GET all users — scoped by company or hotel
router.get('/', ...mgmt, async (req, res) => {
  const filter = {};
  if (req.user.role === 'SuperAdmin') {
    if (req.query.companyId) filter.companyId = req.query.companyId;
    if (req.query.hotelId)   filter.hotelId   = req.query.hotelId;
  } else if (req.user.role === 'CompanyAdmin') {
    filter.companyId = req.user.companyId;
    if (req.query.hotelId) filter.hotelId = req.query.hotelId;
  } else {
    filter.hotelId = req.user.hotelId;
  }
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: { users } });
});

// POST create user (CompanyAdmin or SuperAdmin)
router.post('/', ...SA_CA, async (req, res) => {
  const { name, email, password, role, hotelId } = req.body;

  // CompanyAdmin can only create roles within their company — not SuperAdmin or CompanyAdmin
  if (req.user.role === 'CompanyAdmin') {
    const allowed = ['HotelAdmin', 'Manager', 'Receptionist', 'RestaurantStaff', 'Finance', 'Technician'];
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, message: `CompanyAdmin cannot create role: ${role}` });
    }
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
    companyId: req.user.role === 'CompanyAdmin' ? req.user.companyId : req.body.companyId || null,
    hotelId:   hotelId || null,
  });

  res.status(201).json({ success: true, message: 'User created', data: { user } });
});

// PUT update user
router.put('/:id', ...mgmt, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: { user } });
});

// DELETE (deactivate) user
router.delete('/:id', ...mgmt, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'User deactivated' });
});

module.exports = router;
