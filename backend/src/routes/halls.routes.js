const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/halls/halls.controller');
const uploadHall = require('../middleware/uploadHall');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Technician','Finance'), tenantScope];
const admin = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager'), tenantScope];

// Dashboard
router.get('/dashboard',          ...staff, ctrl.getDashboard);
// Halls CRUD
router.get('/',                   ...staff, ctrl.getHalls);
router.post('/',                  ...admin, ctrl.createHall);
router.put('/:id',                ...admin, ctrl.updateHall);
router.delete('/:id',             ...admin, ctrl.deleteHall);
// Bookings
router.get('/bookings',           ...staff, ctrl.getBookings);
router.get('/bookings/:id',       ...staff, ctrl.getBooking);
router.post('/bookings',          ...staff, ctrl.createBooking);
router.put('/bookings/:id',       ...staff, ctrl.updateBooking);
router.delete('/bookings/:id',    ...staff, ctrl.cancelBooking);

router.post('/:id/images', ...staff, uploadHall.array('images',10), ctrl.uploadImages);
module.exports = router;
