const { MaintenanceRequest } = require('../../models/index');

exports.getRequests = async (req, res) => {
  const { status, priority, assignedTo } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status)     filter.status = status;
  if (priority)   filter.priority = priority;
  if (assignedTo) filter.assignedToUserId = assignedTo;

  const requests = await MaintenanceRequest.find(filter)
    .populate('reportedByUserId', 'name role')
    .populate('assignedToUserId', 'name role')
    .populate('roomId', 'roomNumber floor')
    .sort({ priority: 1, createdAt: -1 });

  res.json({ success: true, data: { requests } });
};

exports.createRequest = async (req, res) => {
  const request = await MaintenanceRequest.create({
    ...req.body,
    hotelId: req.hotelId,
    reportedByUserId: req.user._id,
    status: 'open',
  });

  // If urgent, flag room
  if (req.body.priority === 'urgent' && req.body.roomId) {
    const Room = require('../../models/Room');
    await Room.findByIdAndUpdate(req.body.roomId, { status: 'maintenance' });
  }

  res.status(201).json({ success: true, message: 'Request created', data: { request } });
};

exports.updateRequest = async (req, res) => {
  const { status, assignedToUserId, resolutionNotes } = req.body;
  const update = { ...req.body };

  if (status === 'completed') {
    update.completedAt = new Date();
    update.resolutionNotes = resolutionNotes;
  }

  const request = await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    update,
    { new: true }
  ).populate('assignedToUserId', 'name');

  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

  // If completed and room was in maintenance, free it
  if (status === 'completed' && request.roomId) {
    const Room = require('../../models/Room');
    await Room.findByIdAndUpdate(request.roomId, { status: 'available' });
  }

  res.json({ success: true, message: 'Request updated', data: { request } });
};

exports.assignTechnician = async (req, res) => {
  const { technicianId } = req.body;
  const request = await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { assignedToUserId: technicianId, status: 'assigned' },
    { new: true }
  ).populate('assignedToUserId', 'name');
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  res.json({ success: true, message: 'Technician assigned', data: { request } });
};

exports.deleteRequest = async (req, res) => {
  const { MaintenanceRequest } = require('../../models/index');
  await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { status: 'cancelled' }
  );
  res.json({ success: true, message: 'Request cancelled' });
};
