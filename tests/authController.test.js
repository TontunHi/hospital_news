jest.mock('../models/userModel');
jest.mock('../utils/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('bcrypt');

const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');
const transporter = require('../utils/mailer');
const authController = require('../controllers/authController');

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
    const req = {
        body: {},
        session: {},
        cookies: {},
        query: {},
        params: {},
        ...overrides,
    };
    const res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        clearCookie: jest.fn(),
    };
    return { req, res };
}

describe('Auth Controller', () => {
    afterEach(() => jest.clearAllMocks());

    describe('getLogin', () => {
        test('should redirect to /admin/news if already logged in', () => {
            const { req, res } = mockReqRes({ session: { userId: 1 } });
            authController.getLogin(req, res);
            expect(res.redirect).toHaveBeenCalledWith('/admin/news');
        });

        test('should render login page if not logged in', () => {
            const { req, res } = mockReqRes();
            authController.getLogin(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/login');
        });
    });

    describe('postLogin', () => {
        test('should show error for non-existent user', async () => {
            UserModel.findByUsername.mockResolvedValue(null);
            const { req, res } = mockReqRes({ body: { username: 'fake', password: 'pass' } });

            await authController.postLogin(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/login', {
                error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง'
            });
        });

        test('should show error for wrong password', async () => {
            UserModel.findByUsername.mockResolvedValue({ id: 1, password_hash: 'hash', email: 'a@b.com' });
            bcrypt.compare.mockResolvedValue(false);
            const { req, res } = mockReqRes({ body: { username: 'admin', password: 'wrong' } });

            await authController.postLogin(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/login', {
                error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง'
            });
        });

        test('should send OTP and redirect on correct password', async () => {
            UserModel.findByUsername.mockResolvedValue({ id: 1, password_hash: 'hash', email: 'a@b.com' });
            bcrypt.compare.mockResolvedValue(true);
            const { req, res } = mockReqRes({ body: { username: 'admin', password: 'correct' } });

            await authController.postLogin(req, res);
            expect(transporter.sendMail).toHaveBeenCalled();
            expect(req.session.tempUserId).toBe(1);
            expect(req.session.otp).toBeDefined();
            expect(res.redirect).toHaveBeenCalledWith('/admin/verify-2fa');
        });

        test('should render system error on exception', async () => {
            UserModel.findByUsername.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes({ body: { username: 'admin', password: 'pass' } });

            await authController.postLogin(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/login', {
                error: 'เกิดข้อผิดพลาดของระบบ'
            });
        });
    });

    describe('getVerify2FA', () => {
        test('should redirect to login if no tempUserId', () => {
            const { req, res } = mockReqRes();
            authController.getVerify2FA(req, res);
            expect(res.redirect).toHaveBeenCalledWith('/admin/login');
        });

        test('should render verify page if tempUserId exists', () => {
            const { req, res } = mockReqRes({ session: { tempUserId: 1 } });
            authController.getVerify2FA(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/verify_2fa');
        });
    });

    describe('postVerify2FA', () => {
        test('should redirect to login if no session data', () => {
            const { req, res } = mockReqRes({ body: { otp: '123456' } });
            authController.postVerify2FA(req, res);
            expect(res.redirect).toHaveBeenCalledWith('/admin/login');
        });

        test('should show error for expired OTP', () => {
            const { req, res } = mockReqRes({
                body: { otp: '123456' },
                session: {
                    tempUserId: 1,
                    otp: '123456',
                    otpTime: Date.now() - 6 * 60 * 1000, // 6 minutes ago
                    destroy: jest.fn(),
                },
            });

            authController.postVerify2FA(req, res);
            expect(req.session.destroy).toHaveBeenCalled();
        });

        test('should login on correct OTP', () => {
            const session = {
                tempUserId: 1,
                otp: '654321',
                otpTime: Date.now(),
            };
            const { req, res } = mockReqRes({ body: { otp: '654321' }, session });

            authController.postVerify2FA(req, res);
            expect(session.userId).toBe(1);
            expect(session.tempUserId).toBeUndefined();
            expect(session.otp).toBeUndefined();
            expect(res.redirect).toHaveBeenCalledWith('/admin/news');
        });

        test('should show error for incorrect OTP', () => {
            const { req, res } = mockReqRes({
                body: { otp: '000000' },
                session: { tempUserId: 1, otp: '654321', otpTime: Date.now() },
            });

            authController.postVerify2FA(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/verify_2fa', {
                error: 'รหัส OTP ไม่ถูกต้อง'
            });
        });
    });

    describe('logout', () => {
        test('should destroy session and redirect to login', () => {
            const destroyFn = jest.fn((cb) => cb());
            const { req, res } = mockReqRes({ session: { destroy: destroyFn } });

            authController.logout(req, res);
            expect(destroyFn).toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
            expect(res.redirect).toHaveBeenCalledWith('/admin/login');
        });
    });
});
