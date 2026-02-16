const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const publicRoutes = require('./routes/publicRoutes');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET is not defined.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
            fontSrc: ["'self'", "cdn.jsdelivr.net", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            frameSrc: ["'self'", "www.youtube.com"],
            connectSrc: ["'self'", "cdn.jsdelivr.net"],
            upgradeInsecureRequests: null, // Disable auto-upgrade to HTTPS
        },
    },
    strictTransportSecurity: false, // Disable HSTS for HTTP usage
    crossOriginOpenerPolicy: false, // Disable COOP to reduce noise/issues on IP access
}));

// Rate Limiting for Auth Routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many login attempts, please try again later.'
});
app.use('/admin/login', authLimiter);
app.use('/admin/verify-2fa', authLimiter);

// Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Reduced from true to false for GDPR/security
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.HTTPS === 'true' // Only secure if explicitly enabled or on HTTPS
    }
}));

app.use((req, res, next) => {
    res.locals.userId = req.session.userId;
    res.locals.moment = moment;
    next();
});

// Routes
app.use('/admin', authRoutes);
app.use('/admin', newsRoutes);
app.use('/', publicRoutes);

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
