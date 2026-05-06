const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/finance/dashboard.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const mgmt = [protect, authorize('SuperAdmin','HotelAdmin','Manager'), tenantScope];

router.get('/', ...mgmt, ctrl.getDashboard);
module.exports = router;
