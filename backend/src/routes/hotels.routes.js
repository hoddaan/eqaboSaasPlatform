const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/hotels/hotels.controller');
const { protect, authorize } = require('../middleware/auth');
const uploadHotel = require('../middleware/uploadHotel');
const SCA  = [protect, authorize('SuperAdmin', 'CompanyAdmin')];
const ALL  = [protect, authorize('SuperAdmin', 'CompanyAdmin', 'HotelAdmin', 'Manager', 'Receptionist', 'RestaurantStaff', 'Finance', 'Technician')];
const SA   = [protect, authorize('SuperAdmin')];

router.get   ('/platform-stats', ...SA,  ctrl.getPlatformStats);
router.get   ('/',               ...SCA, ctrl.getHotels);
router.post  ('/',               ...SCA, ctrl.createHotel);
router.get   ('/:id',            ...ALL, ctrl.getHotel);   // all staff can fetch their hotel
router.put   ('/:id',            ...SCA, ctrl.updateHotel);
router.patch ('/:id/toggle',          ...SA,  ctrl.toggleHotel);
router.put   ('/:id/profile',         ...[protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager')], ctrl.updateProfile);
router.post  ('/:id/images/:field',   ...[protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager')], uploadHotel.single('image'), ctrl.uploadImage);
module.exports = router;
