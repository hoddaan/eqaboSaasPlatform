const jwt  = require('jsonwebtoken');
const User = require('../../models/User');

// ── Generate tokens ────────────────────────────────────
const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

// ── Register ───────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, role, hotelId } = req.body;

  // Only SuperAdmin can create other admins
  if (role === 'SuperAdmin') {
    return res.status(403).json({ success: false, message: 'Cannot register as SuperAdmin via API' });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: role || 'Receptionist',
    hotelId: hotelId || null,
  });

  const accessToken  = signAccess(user._id);
  const refreshToken = signRefresh(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user, accessToken, refreshToken },
  });
};

// ── Login ──────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+passwordHash +refreshToken');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account has been deactivated' });
  }

  const accessToken  = signAccess(user._id);
  const refreshToken = signRefresh(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
};

// ── Refresh Token ──────────────────────────────────────
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ success: false, message: 'Token mismatch' });
  }

  const newAccessToken  = signAccess(user._id);
  const newRefreshToken = signRefresh(user._id);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  });
};

// ── Get current user ───────────────────────────────────
exports.getMe = async (req, res) => {
  const Hotel = require('../../models/Hotel');
  const user = await User.findById(req.user._id).populate('hotelId', 'name slug currency timezone services');
  
  // Include hotel services in response so frontend can scope the nav
  const hotelServices = user.hotelId?.services || ['hotel','restaurant','coffee'];
  
  res.json({ success: true, data: { user, hotelServices } });
};

// ── Logout ─────────────────────────────────────────────
exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ success: true, message: 'Logged out successfully' });
};

// ── Change password ────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.passwordHash = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
};
