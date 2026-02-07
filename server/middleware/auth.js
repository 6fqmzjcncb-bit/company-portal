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
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
};

const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
        }

        // Admin always has access
        if (req.session.userRole === 'admin') return next();

        // Check Permissions
        // We need to fetch the role permissions OR store them in session
        // For now, let's fetch to be safe and dynamic, or check if session has them?
        // Optimally, store in session at login. But for now, fetch.
        const { User, Role } = require('../models');
        try {
            const user = await User.findByPk(req.session.userId, {
                include: [{ model: Role, as: 'userRole' }]
            });

            if (user && user.userRole) {
                if (user.userRole.permissions.includes('all') || user.userRole.permissions.includes(permission)) {
                    return next();
                }
            }

            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok: ' + permission });
        } catch (e) {
            console.error('Permission check error:', e);
            return res.status(500).json({ error: 'Yetki kontrolü yapılamadı' });
        }
    };
};

module.exports = { requireAuth, requireAdmin, requirePermission };
