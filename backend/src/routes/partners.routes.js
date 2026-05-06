const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/partners/partners.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist'), tenantScope];

router.get   ('/',               ...staff, ctrl.getAll);
router.post  ('/',               ...staff, ctrl.create);
router.put   ('/:id',            ...staff, ctrl.update);
router.delete('/:id',            ...staff, ctrl.remove);

router.get   ('/payments',       ...staff, ctrl.getPayments);
router.post  ('/payments',       ...staff, ctrl.createPayment);
router.patch ('/payments/:id/paid',   ...staff, ctrl.markPaid);
router.post  ('/payments/:id/send',   ...staff, ctrl.sendReceipt);
module.exports = router;
