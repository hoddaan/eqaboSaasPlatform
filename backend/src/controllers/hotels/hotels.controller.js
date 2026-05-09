const Hotel   = require('../../models/Hotel');
const Company = require('../../models/Company');
const User    = require('../../models/User');
const Room    = require('../../models/Room');

exports.getHotels = async (req, res) => {
  const filter = { isActive: true };

  // CompanyAdmin sees only their company's hotels
  if (req.user.role === 'CompanyAdmin') {
    filter.companyId = req.user.companyId;
  } else if (req.query.companyId) {
    filter.companyId = req.query.companyId;
  }

  const hotels = await Hotel.find(filter)
    .populate('companyId', 'name slug')
    .populate('countryId', 'name code flag')
    .populate('cityId', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { hotels } });
};

exports.getHotel = async (req, res) => {
  const hotel = await Hotel.findById(req.params.id)
    .populate('companyId', 'name')
    .populate('countryId', 'name code')
    .populate('cityId', 'name');
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
  res.json({ success: true, data: { hotel } });
};

exports.createHotel = async (req, res) => {
  const { companyId } = req.body;

  // CompanyAdmin can only create hotels for their own company
  const targetCompanyId = req.user.role === 'CompanyAdmin' ? req.user.companyId : companyId;
  if (!targetCompanyId) return res.status(400).json({ success: false, message: 'companyId is required' });

  const hotel = await Hotel.create({ ...req.body, companyId: targetCompanyId });

  // Auto-create HotelAdmin if provided
  if (req.body.adminEmail && req.body.adminPassword) {
    await User.create({
      name:         req.body.adminName || `${hotel.name} Admin`,
      email:        req.body.adminEmail,
      passwordHash: req.body.adminPassword,
      role:         'HotelAdmin',
      companyId:    targetCompanyId,
      hotelId:      hotel._id,
    });
  }

  res.status(201).json({ success: true, message: 'Hotel created', data: { hotel } });
};

exports.updateHotel = async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
  res.json({ success: true, message: 'Hotel updated', data: { hotel } });
};

exports.toggleHotel = async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

  // Use updateOne with $set to bypass full schema validation
  // (avoids required-field errors on docs created before new fields were added)
  const newStatus = !hotel.isActive;
  await Hotel.updateOne({ _id: hotel._id }, { $set: { isActive: newStatus } });

  res.json({ success: true, message: `Hotel ${newStatus ? 'activated' : 'suspended'}`, data: { ...hotel.toObject(), isActive: newStatus } });
};

exports.getPlatformStats = async (req, res) => {
  const Company = require('../../models/Company');
  const { Transaction } = require('../../models/index');
  const Booking = require('../../models/Booking');

  const [totalCompanies, totalHotels, totalRooms, activeBookings, monthRevenue] = await Promise.all([
    Company.countDocuments({ isActive: true }),
    Hotel.countDocuments({ isActive: true }),
    Room.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
    Booking.countDocuments({ status: 'checked_in' }),
    Transaction.aggregate([
      { $match: { type: 'payment', createdAt: { $gte: new Date(new Date().setDate(1)) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalCompanies,
      totalHotels,
      totalRooms: totalRooms[0]?.total || 0,
      activeBookings,
      monthRevenue: monthRevenue[0]?.total || 0,
    },
  });
};

// ── UPLOAD HOTEL IMAGES ───────────────────────────────
exports.uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const field = req.params.field; // logo, cover, signature
  const allowedFields = ['logoUrl','coverImageUrl','signatureUrl'];
  const fieldMap = { logo: 'logoUrl', cover: 'coverImageUrl', signature: 'signatureUrl', stamp: 'stampUrl' };
  const dbField = fieldMap[field];

  if (!dbField) return res.status(400).json({ success: false, message: 'Invalid image type' });

  const url = `/uploads/hotel/${req.file.filename}`;

  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { [dbField]: url },
    { new: true }
  );

  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
  res.json({ success: true, message: 'Image uploaded', data: { url, hotel } });
};

// ── UPDATE HOTEL PROFILE ──────────────────────────────
exports.updateProfile = async (req, res) => {
  const { name, contactEmail, contactPhone, address, taxRate, currency, timezone,
          website, description, receiptFooter, socialMedia, propertyType, floors, services } = req.body;

  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { name, contactEmail, contactPhone, address, taxRate, currency, timezone,
      website, description, receiptFooter, socialMedia, propertyType, floors, services },
    { new: true }
  ).populate('countryId', 'name').populate('cityId', 'name');

  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
  res.json({ success: true, message: 'Profile updated', data: { hotel } });
};
