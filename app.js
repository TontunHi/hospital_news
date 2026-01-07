// app.js

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ตั้งค่าตัวส่งอีเมล (Transporter)
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function สร้าง Slug
function createSlug(title) {
    if (!title) return '';
    let slug = title.trim();
    slug = slug.replace(/[\s\/\(\)\?]+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
}

// Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
    res.locals.userId = req.session.userId;
    res.locals.moment = moment;
    next();
});

const requireLogin = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/admin/login');
};

// Multer Config (เหมือนเดิม)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let rawDate = req.body.start_date;
        if (!rawDate) rawDate = moment().format('YYYY-MM-DD');
        const startDate = moment(rawDate);
        const folderName = startDate.format('MMMM_YYYY/DD');
        const uploadPath = path.join(__dirname, 'uploads', folderName);
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const sDate = moment(req.body.start_date || new Date()).format('YYYYMMDD');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${sDate}_${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(null, false);
};
const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 20 } }).fields([{ name: 'images', maxCount: 10 }, { name: 'pdf_file', maxCount: 1 }]);

// 1. หน้า Login
app.get('/admin/login', (req, res) => {
    if (req.session.userId) return res.redirect('/admin/news');
    res.render('admin/login');
});

// 2. รับค่า Login -> ตรวจรหัส -> ส่ง OTP
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.render('admin/login', { error: 'ไม่พบชื่อผู้ใช้งาน' });

        const user = users[0];
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');

        if (inputHash === user.password_hash) {
            // รหัสผ่านถูก -> สร้าง OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString(); // เลข 6 หลัก

            // เก็บข้อมูลชั่วคราวใน Session (ยังไม่ถือว่า Login สำเร็จ)
            req.session.tempUserId = user.id;
            req.session.otp = otp;
            req.session.otpTime = Date.now();

            // ส่งอีเมล
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: '🔑 รหัสยืนยันตัวตน (OTP) - Admin Login',
                text: `รหัส OTP ของคุณคือ: ${otp} (มีอายุ 5 นาที)`
            };

            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${user.email}: ${otp}`); // Log ดูเผื่อเมลมีปัญหา

            // ไปหน้ากรอก OTP
            res.redirect('/admin/verify-2fa');
        } else {
            res.render('admin/login', { error: 'รหัสผ่านไม่ถูกต้อง' });
        }
    } catch (err) {
        console.error(err);
        res.render('admin/login', { error: 'เกิดข้อผิดพลาดของระบบ: ' + err.message });
    }
});

// 3. หน้ากรอก OTP
app.get('/admin/verify-2fa', (req, res) => {
    if (!req.session.tempUserId) return res.redirect('/admin/login'); // ถ้าไม่ได้ Login มาก่อน ห้ามเข้า
    res.render('admin/verify_2fa');
});

// 4. ตรวจสอบ OTP -> Login สำเร็จ
app.post('/admin/verify-2fa', (req, res) => {
    const { otp } = req.body;
    const sessionOtp = req.session.otp;
    const otpTime = req.session.otpTime;

    if (!req.session.tempUserId || !sessionOtp) return res.redirect('/admin/login');

    // ตรวจสอบอายุ OTP (5 นาที)
    if (Date.now() - otpTime > 5 * 60 * 1000) {
        req.session.destroy();
        return res.render('admin/login', { error: 'รหัส OTP หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }

    if (otp === sessionOtp) {
        // ✅ OTP ถูกต้อง -> Login จริง
        req.session.userId = req.session.tempUserId;

        // ล้างค่าชั่วคราว
        delete req.session.tempUserId;
        delete req.session.otp;
        delete req.session.otpTime;

        res.redirect('/admin/news');
    } else {
        res.render('admin/verify_2fa', { error: 'รหัส OTP ไม่ถูกต้อง' });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
});

app.get('/admin/news', requireLogin, async (req, res) => {
    try {
        const [newsList] = await db.query('SELECT * FROM news ORDER BY start_date DESC');
        res.render('admin/news_manage', {
            newsList: newsList,
            message: req.query.success ? getSuccessMessage(req.query.success) : null
        });
    } catch (err) {
        res.status(500).send("Error loading news.");
    }
});

function getSuccessMessage(type) {
    if (type === 'upload') return 'เพิ่มข่าวสารใหม่เรียบร้อยแล้ว';
    if (type === 'update') return 'บันทึกการแก้ไขเรียบร้อยแล้ว';
    if (type === 'delete') return 'ลบข่าวสารเรียบร้อยแล้ว';
    return 'ดำเนินการสำเร็จ';
}

app.get('/admin/upload', requireLogin, (req, res) => {
    res.render('admin/upload', { success: req.query.success });
});

app.post('/admin/upload', requireLogin, upload, async (req, res) => {
    const { title, category, youtube_link, start_date, end_date } = req.body;
    const imageFiles = req.files.images || [];
    const pdfFiles = req.files.pdf_file || [];
    const allFiles = [...imageFiles, ...pdfFiles];

    if (!title || !start_date || !end_date) return res.status(400).send('Missing fields.');
    const slug = createSlug(title);

    try {
        await db.query('START TRANSACTION');
        const [result] = await db.query(
            'INSERT INTO news (title, slug, category, youtube_link, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
            [title, slug, category, youtube_link, start_date, end_date]
        );
        const newsId = result.insertId;

        if (allFiles.length > 0) {
            const fileValues = allFiles.map(f => {
                const type = f.mimetype.includes('pdf') ? 'pdf' : 'image';
                const dbPath = path.relative(path.join(__dirname, 'uploads'), f.path).replace(/\\/g, '/');
                return [newsId, path.join('uploads', dbPath), type, f.originalname];
            });
            await db.query('INSERT INTO attachments (news_id, file_path, file_type, original_name) VALUES ?', [fileValues]);
        }
        await db.query('COMMIT');
        res.redirect('/admin/news?success=upload');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        allFiles.forEach(f => fs.unlink(f.path, () => { }));
        res.status(500).send("Error uploading: " + err.message);
    }
});

app.get('/admin/edit/:id', requireLogin, async (req, res) => {
    try {
        const [news] = await db.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
        if (news.length === 0) return res.status(404).send('Not Found');
        const [files] = await db.query('SELECT * FROM attachments WHERE news_id = ?', [req.params.id]);
        news[0].start_date_local = moment(news[0].start_date).format('YYYY-MM-DD HH:mm');
        news[0].end_date_local = moment(news[0].end_date).format('YYYY-MM-DD HH:mm');
        res.render('admin/edit', { news: news[0], files: files });
    } catch (err) {
        res.status(500).send('Error loading edit page');
    }
});

app.post('/admin/update/:id', requireLogin, upload, async (req, res) => {
    const newsId = req.params.id;
    const { title, category, youtube_link, start_date, end_date, files_to_delete } = req.body;
    const imageFiles = req.files.images || [];
    const pdfFiles = req.files.pdf_file || [];
    const allNewFiles = [...imageFiles, ...pdfFiles];
    const slug = createSlug(title);

    try {
        await db.query('START TRANSACTION');
        await db.query(
            'UPDATE news SET title = ?, slug = ?, category = ?, youtube_link = ?, start_date = ?, end_date = ? WHERE id = ?',
            [title, slug, category, youtube_link, start_date, end_date, newsId]
        );

        if (files_to_delete) {
            const idsToDelete = Array.isArray(files_to_delete) ? files_to_delete : [files_to_delete];
            const [oldFiles] = await db.query('SELECT file_path FROM attachments WHERE id IN (?)', [idsToDelete]);
            await db.query('DELETE FROM attachments WHERE id IN (?)', [idsToDelete]);
            oldFiles.forEach(f => {
                const fullPath = path.join(__dirname, f.file_path);
                if (fs.existsSync(fullPath)) fs.unlink(fullPath, () => { });
            });
        }

        if (allNewFiles.length > 0) {
            const fileValues = allNewFiles.map(f => {
                const type = f.mimetype.includes('pdf') ? 'pdf' : 'image';
                const dbPath = path.relative(path.join(__dirname, 'uploads'), f.path).replace(/\\/g, '/');
                return [newsId, path.join('uploads', dbPath), type, f.originalname];
            });
            await db.query('INSERT INTO attachments (news_id, file_path, file_type, original_name) VALUES ?', [fileValues]);
        }
        await db.query('COMMIT');
        res.redirect('/admin/news?success=update');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        allNewFiles.forEach(f => fs.unlink(f.path, () => { }));
        res.status(500).send("Error updating: " + err.message);
    }
});

app.get('/admin/delete/:id', requireLogin, async (req, res) => {
    const newsId = req.params.id;
    try {
        const [files] = await db.query('SELECT file_path FROM attachments WHERE news_id = ?', [newsId]);
        await db.query('DELETE FROM news WHERE id = ?', [newsId]);
        files.forEach(f => {
            const fullPath = path.join(__dirname, f.file_path);
            if (fs.existsSync(fullPath)) fs.unlink(fullPath, () => { });
        });
        res.redirect('/admin/news?success=delete');
    } catch (err) {
        res.status(500).send('Error deleting news');
    }
});

// New API to delete individual file
app.post('/admin/delete-file/:id', requireLogin, async (req, res) => {
    const attachmentId = req.params.id;
    try {
        const [files] = await db.query('SELECT file_path FROM attachments WHERE id = ?', [attachmentId]);
        if (files.length === 0) return res.status(404).json({ success: false, message: 'File not found' });

        const file = files[0];
        const fullPath = path.join(__dirname, file.file_path);

        // Delete from DB
        await db.query('DELETE FROM attachments WHERE id = ?', [attachmentId]);

        // Delete from Filesystem
        if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (err) => {
                if (err) console.error('Failed to delete file:', err);
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/', async (req, res) => {
    const categories = ['ข่าวสารประชาสัมพันธ์', 'ประชุมอบรม / สัมมนา', 'ประกาศรับสมัครงาน', 'ข่าวสารความรู้'];
    const currentCategory = req.query.category || categories[0];
    try {
        const sql = `
            SELECT id, title, slug, category, start_date, end_date, youtube_link, view_count 
            FROM news 
            WHERE category = ? 
            AND start_date <= NOW() 
            AND end_date >= NOW()
            ORDER BY start_date DESC
        `;
        const [newsList] = await db.query(sql, [currentCategory]);
        res.render('index', { newsList, currentCategory, categories });
    } catch (err) {
        res.status(500).send('Error loading home');
    }
});

app.get('/archive', async (req, res) => {
    try {
        const sql = `
            SELECT id, title, slug, category, start_date, end_date, youtube_link, view_count 
            FROM news 
            WHERE end_date < NOW()
            ORDER BY end_date DESC
        `;
        const [newsList] = await db.query(sql);
        res.render('archive', { newsList });
    } catch (err) {
        res.status(500).send('Error loading archive.');
    }
});

const newsDetailHandler = async (req, res) => {
    const newsId = req.params.id;
    const requestedSlug = req.params.slug;
    const viewKey = `viewed_news_${newsId}`;

    try {
        const [newsResult] = await db.query('SELECT * FROM news WHERE id = ?', [newsId]);
        if (newsResult.length === 0) return res.status(404).send('Not Found');
        const news = newsResult[0];

        const correctSlug = createSlug(news.title);
        if (requestedSlug !== correctSlug) return res.redirect(301, `/news/${newsId}/${correctSlug}`);

        const now = moment();
        const startDate = moment(news.start_date);

        if (!req.session.userId && now.isBefore(startDate)) return res.status(404).send('News not yet available.');

        if (!req.cookies[viewKey]) {
            await db.query('UPDATE news SET view_count = view_count + 1 WHERE id = ?', [newsId]);
            res.cookie(viewKey, 'true', { maxAge: 86400000, httpOnly: true });
        }

        const [files] = await db.query('SELECT * FROM attachments WHERE news_id = ?', [newsId]);
        res.render('news_detail', { news: news, files: files });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading detail');
    }
};

app.get('/news/:id', newsDetailHandler);
app.get('/news/:id/:slug', newsDetailHandler);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const os = require('os');
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) return;
            console.log(`[LAN ACCESS] http://${iface.address}:${PORT}`);
        });
    });
});