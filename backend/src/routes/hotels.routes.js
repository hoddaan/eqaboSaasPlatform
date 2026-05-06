const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/hotels/hotels.controller');
const { protect, authorize } = require('../middleware/auth');
const SCA  = [protect, authorize('SuperAdmin', 'CompanyAdmin')];
const ALL  = [protect, authorize('SuperAdmin', 'CompanyAdmin', 'HotelAdmin', 'Manager', 'Receptionist', 'RestaurantStaff', 'Finance', 'Technician')];
const SA   = [protect, authorize('SuperAdmin')];

router.get   ('/platform-stats', ...SA,  ctrl.getPlatformStats);
router.get   ('/',               ...SCA, ctrl.getHotels);
router.post  ('/',               ...SCA, ctrl.createHotel);
router.get   ('/:id',            ...ALL, ctrl.getHotel);   // all staff can fetch their hotel
router.put   ('/:id',            ...SCA, ctrl.updateHotel);
router.patch ('/:id/toggle',     ...SA,  ctrl.toggleHotel);
module.exports = router;
