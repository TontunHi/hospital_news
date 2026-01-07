const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/verify-2fa', authController.getVerify2FA);
router.post('/verify-2fa', authController.postVerify2FA);
router.get('/logout', authController.logout);

module.exports = router;
