const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cities/cities.controller');
const { protect, authorize } = require('../middleware/auth');
const SA = [protect, authorize('SuperAdmin')];

router.get   ('/',    protect, ctrl.getAll);
router.post  ('/',    ...SA,   ctrl.create);
router.put   ('/:id', ...SA,   ctrl.update);
router.delete('/:id', ...SA,   ctrl.remove);
module.exports = router;
