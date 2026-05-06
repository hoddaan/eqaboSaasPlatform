const Country = require('../../models/Country');

exports.getAll = async (req, res) => {
  const countries = await Country.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: { countries } });
};

exports.create = async (req, res) => {
  const country = await Country.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, message: 'Country created', data: { country } });
};

exports.update = async (req, res) => {
  const country = await Country.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!country) return res.status(404).json({ success: false, message: 'Country not found' });
  res.json({ success: true, data: { country } });
};

exports.remove = async (req, res) => {
  await Country.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Country removed' });
};
