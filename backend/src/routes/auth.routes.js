// auth.routes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../controllers/auth/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register',        auth.register);
router.post('/login',           auth.login);
router.post('/refresh',         auth.refreshToken);
router.get ('/me',   protect,   auth.getMe);
router.post('/logout', protect, auth.logout);
router.put ('/change-password', protect, auth.changePassword);

module.exports = router;
