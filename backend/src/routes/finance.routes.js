const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/finance/dashboard.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const fin = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'), tenantScope];

router.get   ('/dashboard',          ...fin, ctrl.getDashboard);
router.get   ('/report',             ...fin, ctrl.getReport);
// Assets
router.get   ('/assets',             ...fin, ctrl.getAssets);
router.post  ('/assets',             ...fin, ctrl.createAsset);
router.put   ('/assets/:id',         ...fin, ctrl.updateAsset);
router.delete('/assets/:id',         ...fin, ctrl.deleteAsset);
// Liabilities
router.get   ('/liabilities',        ...fin, ctrl.getLiabilities);
router.post  ('/liabilities',        ...fin, ctrl.createLiability);
router.put   ('/liabilities/:id',    ...fin, ctrl.updateLiability);
router.delete('/liabilities/:id',    ...fin, ctrl.deleteLiability);
// Expenses
router.get   ('/expenses',           ...fin, ctrl.getExpenses);
router.post  ('/expenses',           ...fin, ctrl.createExpense);
router.put   ('/expenses/:id',       ...fin, ctrl.updateExpense);
router.delete('/expenses/:id',       ...fin, ctrl.deleteExpense);

module.exports = router;
