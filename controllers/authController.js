const crypto = require('crypto');
const UserModel = require('../models/userModel');
const transporter = require('../utils/mailer');

exports.getLogin = (req, res) => {
    if (req.session.userId) return res.redirect('/admin/news');
    res.render('admin/login');
};

exports.postLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await UserModel.findByUsername(username);
        if (!user) return res.render('admin/login', { error: 'ไม่พบชื่อผู้ใช้งาน' });

        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        
        if (inputHash === user.password_hash) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            req.session.tempUserId = user.id;
            req.session.otp = otp;
            req.session.otpTime = Date.now();

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: '🔑 รหัสยืนยันตัวตน (OTP) - Admin Login',
                text: `รหัส OTP ของคุณคือ: ${otp} (มีอายุ 5 นาที)`
            };

            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${user.email}: ${otp}`);

            res.redirect('/admin/verify-2fa');
        } else {
            res.render('admin/login', { error: 'รหัสผ่านไม่ถูกต้อง' });
        }
    } catch (err) {
        console.error(err);
        res.render('admin/login', { error: 'เกิดข้อผิดพลาดของระบบ: ' + err.message });
    }
};

exports.getVerify2FA = (req, res) => {
    if (!req.session.tempUserId) return res.redirect('/admin/login');
    res.render('admin/verify_2fa');
};

exports.postVerify2FA = (req, res) => {
    const { otp } = req.body;
    const sessionOtp = req.session.otp;
    const otpTime = req.session.otpTime;

    if (!req.session.tempUserId || !sessionOtp) return res.redirect('/admin/login');

    if (Date.now() - otpTime > 5 * 60 * 1000) {
        req.session.destroy();
        return res.render('admin/login', { error: 'รหัส OTP หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }

    if (otp === sessionOtp) {
        req.session.userId = req.session.tempUserId;
        delete req.session.tempUserId;
        delete req.session.otp;
        delete req.session.otpTime;

        res.redirect('/admin/news');
    } else {
        res.render('admin/verify_2fa', { error: 'รหัส OTP ไม่ถูกต้อง' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
};
