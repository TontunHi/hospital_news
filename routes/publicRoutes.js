const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/', publicController.getHome);
router.get('/archive', publicController.getArchive);
router.get('/news/:id', publicController.getNewsDetail);
router.get('/news/:id/:slug', publicController.getNewsDetail);

module.exports = router;
