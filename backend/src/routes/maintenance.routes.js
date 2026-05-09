const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/maintenance/maintenance.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const upload = require('../middleware/upload');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Technician','Finance'), tenantScope];

router.get   ('/dashboard', ...staff, ctrl.getDashboard);
router.get   ('/',          ...staff, ctrl.getRequests);
router.get   ('/:id',       ...staff, ctrl.getRequest);
router.post  ('/',          ...staff, ctrl.createRequest);
router.put   ('/:id',       ...staff, ctrl.updateRequest);
router.delete('/:id',       ...staff, ctrl.deleteRequest);
router.post('/:id/images',  ...staff, upload.array('images', 10), ctrl.uploadImages);
router.delete('/:id/images',...staff, ctrl.deleteImage);
module.exports = router;
