const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect: verify JWT ────────────────────────────────
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ── Authorize: check roles ─────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' is not authorized.` });
  }
  next();
};

// ── Tenant scope: sets req.hotelId and req.companyId ──
const tenantScope = (req, res, next) => {
  const u = req.user;

  if (u.role === 'SuperAdmin') {
    // SuperAdmin can scope to any company or hotel via query/body
    req.companyId = req.query.companyId || req.body.companyId || null;
    req.hotelId   = req.query.hotelId   || req.body.hotelId   || null;
  } else if (u.role === 'CompanyAdmin') {
    // CompanyAdmin sees all hotels under their company
    req.companyId = u.companyId;
    req.hotelId   = req.query.hotelId || req.body.hotelId || null; // optional filter to one hotel
  } else {
    // All hotel-level roles are locked to their hotel
    req.companyId = u.companyId;
    req.hotelId   = u.hotelId;
  }
  next();
};

// ── Convenience middleware bundles ─────────────────────
const superAdminOnly  = [protect, authorize('SuperAdmin')];
const companyOrSuper  = [protect, authorize('SuperAdmin', 'CompanyAdmin'), tenantScope];
const management      = [protect, authorize('SuperAdmin', 'CompanyAdmin', 'HotelAdmin', 'Manager'), tenantScope];
const hotelStaff      = [protect, authorize('SuperAdmin', 'CompanyAdmin', 'HotelAdmin', 'Manager', 'Receptionist', 'RestaurantStaff', 'Finance', 'Technician'), tenantScope];

module.exports = { protect, authorize, tenantScope, superAdminOnly, companyOrSuper, management, hotelStaff };
