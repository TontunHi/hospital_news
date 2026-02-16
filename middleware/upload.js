const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let rawDate = req.body.start_date;
        if (!rawDate) rawDate = moment().format('YYYY-MM-DD');
        const startDate = moment(rawDate);
        const folderName = startDate.format('MMMM_YYYY/DD');
        const uploadPath = path.join(__dirname, '..', 'uploads', folderName);
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const sDate = moment(req.body.start_date || new Date()).format('YYYYMMDD');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        // Fix for Thai filename encoding: Buffer the string as 'latin1' then decode as 'utf8'
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${sDate}_${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(null, false);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 50 } // 50MB
}).fields([{ name: 'images', maxCount: 10 }, { name: 'pdf_file', maxCount: 3 }]);

module.exports = upload;
