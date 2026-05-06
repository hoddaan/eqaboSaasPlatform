const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/staff/staff.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const mgr  = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager'), tenantScope];
const any  = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Finance'), tenantScope];

router.get   ('/dashboard',        ...mgr, ctrl.getDashboard);
router.get   ('/',                 ...any, ctrl.getStaff);
router.get   ('/:id',              ...mgr, ctrl.getOne);
router.post  ('/',                 ...mgr, ctrl.createStaff);
router.put   ('/:id',              ...mgr, ctrl.updateStaff);
router.delete('/:id',              ...mgr, ctrl.deactivateStaff);

router.get   ('/leaves/all',       ...mgr, ctrl.getLeaves);
router.post  ('/leaves',           ...any, ctrl.createLeave);
router.patch ('/leaves/:id',       ...mgr, ctrl.updateLeave);

router.get   ('/attendance/all',   ...mgr, ctrl.getAttendance);
router.post  ('/attendance/mark',  ...mgr, ctrl.markAttendance);
router.post  ('/attendance/bulk',  ...mgr, ctrl.bulkAttendance);

// Payroll
router.get   ('/payroll',           ...mgr, ctrl.getPayroll);
router.post  ('/payroll/generate',  ...mgr, ctrl.generatePayroll);
router.put   ('/payroll/:id',       ...mgr, ctrl.updatePayroll);
router.post  ('/payroll/approve',   ...mgr, ctrl.approvePayroll);
router.post  ('/payroll/paid',      ...mgr, ctrl.markPayrollPaid);

module.exports = router;
