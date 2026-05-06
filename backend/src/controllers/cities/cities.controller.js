const City = require('../../models/City');

exports.getAll = async (req, res) => {
  const filter = { isActive: true };
  if (req.query.countryId) filter.countryId = req.query.countryId;
  const cities = await City.find(filter).populate('countryId', 'name code').sort({ name: 1 });
  res.json({ success: true, data: { cities } });
};

exports.create = async (req, res) => {
  const city = await City.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, message: 'City created', data: { city } });
};

exports.update = async (req, res) => {
  const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!city) return res.status(404).json({ success: false, message: 'City not found' });
  res.json({ success: true, data: { city } });
};

exports.remove = async (req, res) => {
  await City.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'City removed' });
};
