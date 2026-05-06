const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/finance/finance.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const fin = [protect, authorize('SuperAdmin','HotelAdmin','Manager','Finance'), tenantScope];

router.get  ('/report',       ...fin, ctrl.getFinanceReport);
router.get  ('/transactions', ...fin, ctrl.getTransactions);
router.post ('/transactions', ...fin, ctrl.createTransaction);
router.get  ('/invoices',     ...fin, ctrl.getInvoices);
router.post ('/invoices',     ...fin, ctrl.createInvoice);
router.put  ('/invoices/:id', ...fin, ctrl.updateInvoice);
module.exports = router;
