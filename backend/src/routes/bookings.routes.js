const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/bookings/bookings.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Technician','Finance'), tenantScope];

router.get   ('/',       ...staff, ctrl.getBookings);
router.post  ('/',       ...staff, ctrl.createBooking);
router.get   ('/:id',    ...staff, ctrl.getBooking);
router.put   ('/:id',    ...staff, ctrl.updateBooking);
router.delete('/:id',    ...staff, ctrl.deleteBooking);
module.exports = router;
