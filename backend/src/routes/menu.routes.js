const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orders/orders.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff'), tenantScope];

router.get   ('/',    ...staff, ctrl.getMenu);
router.post  ('/',    ...staff, ctrl.createMenuItem);
router.put   ('/:id', ...staff, ctrl.updateMenuItem);
router.delete('/:id', ...staff, ctrl.deleteMenuItem);
module.exports = router;
