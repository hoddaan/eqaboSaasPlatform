const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/rooms/rooms.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
// Include CompanyAdmin so they can create/manage rooms across their hotels
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist'), tenantScope];

router.get   ('/stats',  ...staff, ctrl.getRoomStats);
router.get   ('/',       ...staff, ctrl.getRooms);
router.post  ('/',       ...staff, ctrl.createRoom);
router.get   ('/:id',    ...staff, ctrl.getRoom);
router.put   ('/:id',    ...staff, ctrl.updateRoom);
router.delete('/:id',    ...staff, ctrl.deleteRoom);
module.exports = router;
