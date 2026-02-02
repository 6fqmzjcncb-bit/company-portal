const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User } = require('../models');

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }

        // Şifreyi kontrol et
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }

        // Session oluştur
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.userName = user.full_name;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş sırasında bir hata oluştu' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Çıkış yapılırken hata oluştu' });
        }
        res.json({ success: true });
    });
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Oturum bulunamadı' });
    }

    res.json({
        id: req.session.userId,
        full_name: req.session.userName,
        role: req.session.userRole
    });
});

module.exports = router;
