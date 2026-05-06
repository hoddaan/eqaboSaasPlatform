const Company = require('../../models/Company');
const User    = require('../../models/User');
const Hotel   = require('../../models/Hotel');

exports.getAll = async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  const companies = await Company.find(filter)
    .populate('countryId', 'name code flag')
    .populate('cityId', 'name')
    .populate('adminUserId', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { companies } });
};

exports.getOne = async (req, res) => {
  const company = await Company.findById(req.params.id)
    .populate('countryId', 'name code flag')
    .populate('cityId', 'name')
    .populate('adminUserId', 'name email role');
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const [hotelCount, userCount] = await Promise.all([
    Hotel.countDocuments({ companyId: company._id, isActive: true }),
    User.countDocuments({ companyId: company._id, isActive: true }),
  ]);
  res.json({ success: true, data: { company, hotelCount, userCount } });
};

exports.create = async (req, res) => {
  const { name, countryId, cityId, address, contactEmail, contactPhone, adminName, adminEmail, adminPassword } = req.body;

  const company = await Company.create({
    name, countryId, cityId, address, contactEmail, contactPhone,
    createdBy: req.user._id,
  });

  let adminUser = null;
  if (adminEmail && adminPassword) {
    adminUser = await User.create({
      name:         adminName || `${name} Admin`,
      email:        adminEmail,
      passwordHash: adminPassword,
      role:         'CompanyAdmin',
      companyId:    company._id,
    });
    company.adminUserId = adminUser._id;
    await company.save();
  }

  res.status(201).json({ success: true, message: 'Company created', data: { company, adminUser } });
};

exports.update = async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  res.json({ success: true, message: 'Company updated', data: { company } });
};

exports.toggle = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  company.isActive = !company.isActive;
  await company.save();
  await Hotel.updateMany({ companyId: company._id }, { isActive: company.isActive });
  res.json({ success: true, message: `Company ${company.isActive ? 'activated' : 'suspended'}`, data: { company } });
};

exports.getCompanyHotels = async (req, res) => {
  const hotels = await Hotel.find({ companyId: req.params.id, isActive: true })
    .populate('countryId', 'name code').populate('cityId', 'name');
  res.json({ success: true, data: { hotels } });
};

exports.getCompanyUsers = async (req, res) => {
  const users = await User.find({ companyId: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { users } });
};

exports.getStats = async (req, res) => {
  const [companies, hotels, users] = await Promise.all([
    Company.countDocuments({ isActive: true }),
    Hotel.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true, role: { $ne: 'SuperAdmin' } }),
  ]);
  res.json({ success: true, data: { companies, hotels, users } });
};
