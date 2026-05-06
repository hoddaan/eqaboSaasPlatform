const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/finance/finance.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const fin = [protect, authorize('SuperAdmin','HotelAdmin','Manager','Finance'), tenantScope];

router.get  ('/',  ...fin, ctrl.getTransactions);
router.post ('/',  ...fin, ctrl.createTransaction);
module.exports = router;
