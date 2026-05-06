const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/maintenance/maintenance.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Technician'), tenantScope];

router.get   ('/',        ...staff, ctrl.getRequests);
router.post  ('/',        ...staff, ctrl.createRequest);
router.put   ('/:id',     ...staff, ctrl.updateRequest);
router.delete('/:id',     ...staff, ctrl.deleteRequest);
module.exports = router;
