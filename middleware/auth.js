exports.requireLogin = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/admin/login');
};
