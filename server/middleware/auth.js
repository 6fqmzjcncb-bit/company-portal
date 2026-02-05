// Oturum kontrolü middleware'i
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        console.log(`⛔ Auth Blocked: No session for ${req.method} ${req.url}`);
        return res.status(401).json({
            error: 'Giriş yapmanız gerekiyor',
            redirectTo: '/index.html'
        });
    }
    // console.log(`✅ Auth OK: User ${req.session.userId} -> ${req.url}`);
    next();
};

// Admin kontrolü middleware'i
const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: 'Giriş yapmanız gerekiyor'
        });
    }

    if (req.session.userRole !== 'admin') {
        return res.status(403).json({
            error: 'Bu işlem için admin yetkisi gerekiyor'
        });
    }

    next();
};

module.exports = { requireAuth, requireAdmin };
