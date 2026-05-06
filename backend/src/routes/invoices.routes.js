const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/finance/finance.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const fin = [protect, authorize('SuperAdmin','HotelAdmin','Manager','Finance'), tenantScope];

router.get  ('/',    ...fin, ctrl.getInvoices);
router.post ('/',    ...fin, ctrl.createInvoice);
router.put  ('/:id', ...fin, ctrl.updateInvoice);
module.exports = router;
