const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/companies/companies.controller');
const { protect, authorize } = require('../middleware/auth');
const SA  = [protect, authorize('SuperAdmin')];
const SCA = [protect, authorize('SuperAdmin', 'CompanyAdmin')];

router.get   ('/stats',          ...SA,  ctrl.getStats);
router.get   ('/',               ...SA,  ctrl.getAll);
router.post  ('/',               ...SA,  ctrl.create);
router.get   ('/:id',            ...SCA, ctrl.getOne);
router.put   ('/:id',            ...SA,  ctrl.update);
router.patch ('/:id/toggle',     ...SA,  ctrl.toggle);
router.get   ('/:id/hotels',     ...SCA, ctrl.getCompanyHotels);
router.get   ('/:id/users',      ...SCA, ctrl.getCompanyUsers);
module.exports = router;
