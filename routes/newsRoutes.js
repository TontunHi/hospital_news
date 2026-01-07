const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const upload = require('../middleware/upload');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin); // Protect all routes below

router.get('/news', newsController.getNewsList);
router.get('/upload', newsController.getUpload);
router.post('/upload', upload, newsController.postUpload);
router.get('/edit/:id', newsController.getEdit);
router.post('/update/:id', upload, newsController.postUpdate);
router.get('/delete/:id', newsController.deleteNews);
router.post('/delete-file/:id', newsController.deleteFile);

module.exports = router;
