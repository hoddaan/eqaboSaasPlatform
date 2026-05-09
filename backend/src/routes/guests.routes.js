const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/guests/guests.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Technician','Finance'), tenantScope];

router.get   ('/',                  ...staff, ctrl.getGuests);
router.post  ('/',                  ...staff, ctrl.createGuest);
router.get   ('/:id',               ...staff, ctrl.getGuest);
router.put   ('/:id',               ...staff, ctrl.updateGuest);
router.delete('/:id',               ...staff, ctrl.deleteGuest);

// Service requests
router.post  ('/:id/services',      ...staff, ctrl.addService);
router.put   ('/:id/services/:sid', ...staff, ctrl.updateService);
router.delete('/:id/services/:sid', ...staff, ctrl.removeService);

// Checkout with receipt
router.post  ('/:id/checkout',      ...staff, ctrl.checkoutGuest);

// Partial payment while staying
router.post  ('/:id/pay',           ...staff, ctrl.recordPayment);

module.exports = router;
