const { MaintenanceRequest } = require('../../models/index');
const Room = require('../../models/Room');

const ROOM_STATUS_ON_PRIORITY = {
  low:    null,          // don't change room status
  medium: null,          // don't change
  high:   'maintenance', // mark room maintenance
  urgent: 'maintenance', // mark room maintenance immediately
};

// ── GET ALL ──────────────────────────────────────────
exports.getRequests = async (req, res) => {
  const { status, priority, category, roomId, assignedTo, from, to } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status)     filter.status   = status;
  if (priority)   filter.priority = priority;
  if (category)   filter.category = category;
  if (roomId)     filter.roomId   = roomId;
  if (assignedTo) filter.assignedToUserId = assignedTo;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const requests = await MaintenanceRequest.find(filter)
    .populate('reportedByUserId', 'name role')
    .populate('assignedToUserId', 'name role department')
    .populate('roomId', 'roomNumber floor type status')
    .sort({ priority: 1, createdAt: -1 })
    .limit(200);

  res.json({ success: true, data: { requests } });
};

// ── GET ONE ──────────────────────────────────────────
exports.getRequest = async (req, res) => {
  const request = await MaintenanceRequest.findOne({ _id: req.params.id, hotelId: req.hotelId })
    .populate('reportedByUserId', 'name role')
    .populate('assignedToUserId', 'name role department phone')
    .populate('roomId', 'roomNumber floor type status');
  if (!request) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: { request } });
};

// ── DASHBOARD ─────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  const [all, todayCompleted] = await Promise.all([
    MaintenanceRequest.find({ hotelId: req.hotelId }).populate('roomId', 'roomNumber'),
    MaintenanceRequest.find({
      hotelId: req.hotelId, status: 'completed',
      completedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) },
    }),
  ]);

  const byStatus   = {};
  const byPriority = {};
  const byCategory = {};
  for (const r of all) {
    byStatus[r.status]     = (byStatus[r.status]||0) + 1;
    byPriority[r.priority] = (byPriority[r.priority]||0) + 1;
    byCategory[r.category] = (byCategory[r.category]||0) + 1;
  }

  const open      = all.filter(r => r.status === 'open').length;
  const inProgress= all.filter(r => ['assigned','in_progress'].includes(r.status)).length;
  const urgent    = all.filter(r => r.priority === 'urgent' && !['completed','cancelled'].includes(r.status)).length;
  const totalCost = all.filter(r=>r.status==='completed').reduce((s,r)=>s+(r.actualCost||0),0);
  const avgMinutes= todayCompleted.length ? Math.round(todayCompleted.reduce((s,r)=>{
    if (r.startedAt&&r.completedAt) return s+(r.completedAt-r.startedAt)/60000;
    return s;
  },0)/todayCompleted.length) : 0;

  res.json({ success: true, data: { open, inProgress, urgent, completedToday: todayCompleted.length, totalCost, avgMinutes, byStatus, byPriority, byCategory } });
};

// ── CREATE ────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  const { roomId, priority, affectsRoom, scheduledDate, costEstimate } = req.body;

  const request = await MaintenanceRequest.create({
    ...req.body,
    hotelId: req.hotelId,
    reportedByUserId: req.user._id,
    status: 'open',
    scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
  });

  // Set room status if room linked and affects room
  if (roomId && affectsRoom) {
    const roomStatus = ROOM_STATUS_ON_PRIORITY[priority] || 'maintenance';
    await Room.findByIdAndUpdate(roomId, { status: roomStatus });
    await MaintenanceRequest.findByIdAndUpdate(request._id, { roomStatusSet: roomStatus });
  }

  const populated = await MaintenanceRequest.findById(request._id)
    .populate('reportedByUserId', 'name role')
    .populate('roomId', 'roomNumber floor type status');

  res.status(201).json({ success: true, message: 'Maintenance request created', data: { request: populated } });
};

// ── UPDATE ────────────────────────────────────────────
exports.updateRequest = async (req, res) => {
  const { status, assignedToUserId, resolutionNotes, actualCost, partsUsed, scheduledDate, costEstimate, affectsRoom, priority } = req.body;
  const existing = await MaintenanceRequest.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

  const update = { ...req.body };
  if (scheduledDate) update.scheduledDate = new Date(scheduledDate);

  // Status transition timestamps
  if (status === 'in_progress' && existing.status !== 'in_progress') update.startedAt = new Date();
  if (status === 'completed') {
    update.completedAt      = new Date();
    update.resolutionNotes  = resolutionNotes;
    if (!update.startedAt && !existing.startedAt) update.startedAt = new Date();
  }

  const request = await MaintenanceRequest.findByIdAndUpdate(existing._id, update, { new: true })
    .populate('reportedByUserId', 'name role')
    .populate('assignedToUserId', 'name role department')
    .populate('roomId', 'roomNumber floor type status');

  // Room status management
  if (request.roomId) {
    if (status === 'completed') {
      // Free the room if we were the ones who set it to maintenance
      if (existing.roomStatusSet) {
        await Room.findByIdAndUpdate(request.roomId, { status: 'available' });
      }
    } else if (affectsRoom !== undefined) {
      if (affectsRoom) {
        const roomStatus = ROOM_STATUS_ON_PRIORITY[priority||existing.priority] || 'maintenance';
        await Room.findByIdAndUpdate(request.roomId, { status: roomStatus });
        await MaintenanceRequest.findByIdAndUpdate(request._id, { roomStatusSet: roomStatus });
      } else {
        // Unset room maintenance if we previously set it
        if (existing.roomStatusSet) {
          await Room.findByIdAndUpdate(request.roomId, { status: 'available' });
          await MaintenanceRequest.findByIdAndUpdate(request._id, { roomStatusSet: null });
        }
      }
    }
  }

  res.json({ success: true, message: 'Request updated', data: { request } });
};

// ── ASSIGN TECHNICIAN ─────────────────────────────────
exports.assignTechnician = async (req, res) => {
  const { technicianId } = req.body;
  const request = await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { assignedToUserId: technicianId, status: 'assigned' },
    { new: true }
  ).populate('assignedToUserId', 'name role');
  if (!request) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Technician assigned', data: { request } });
};

// ── DELETE / CANCEL ───────────────────────────────────
exports.deleteRequest = async (req, res) => {
  const request = await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { status: 'cancelled' },
    { new: true }
  );
  // Free room if we had set it to maintenance
  if (request?.roomId && request?.roomStatusSet) {
    await Room.findByIdAndUpdate(request.roomId, { status: 'available' });
  }
  res.json({ success: true, message: 'Request cancelled' });
};

// ── UPLOAD IMAGES ─────────────────────────────────────
exports.uploadImages = async (req, res) => {
  const { type } = req.query; // 'issue' or 'proof'
  if (!req.files || !req.files.length) {
    return res.status(400).json({ success: false, message: 'No images uploaded' });
  }

  const urls = req.files.map(f => `/uploads/maintenance/${f.filename}`);
  const field = type === 'proof' ? 'proofImages' : 'issueImages';

  const request = await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { $push: { [field]: { $each: urls } } },
    { new: true }
  ).populate('reportedByUserId', 'name').populate('roomId', 'roomNumber');

  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  res.json({ success: true, message: `${urls.length} image(s) uploaded`, data: { urls, request } });
};

// ── DELETE IMAGE ─────────────────────────────────────
exports.deleteImage = async (req, res) => {
  const { type, url } = req.body;
  const field = type === 'proof' ? 'proofImages' : 'issueImages';
  await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { $pull: { [field]: url } }
  );
  // optionally delete file from disk
  const path = require('path');
  const fs   = require('fs');
  const fp   = path.join(__dirname, '../../../', url);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ success: true });
};
