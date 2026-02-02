const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User, Product } = require('../models');
const { requireAdmin } = require('../middleware/auth');

// Tüm stok durumunu görüntüle (sadece admin)
router.get('/stock', requireAdmin, async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['name', 'ASC']]
        });
        res.json(products);
    } catch (error) {
        console.error('Stock fetch error:', error);
        res.status(500).json({ error: 'Stok bilgisi getirilemedi' });
    }
});

// Yeni kullanıcı ekle (sadece admin)
router.post('/users', requireAdmin, async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            password: hashedPassword,
            full_name,
            role: role || 'staff'
        });

        // Şifreyi response'dan çıkar
        const userResponse = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            created_at: user.created_at
        };

        res.status(201).json(userResponse);
    } catch (error) {
        console.error('User create error:', error);
        res.status(500).json({ error: 'Kullanıcı oluşturulamadı' });
    }
});

// Tüm kullanıcıları listele (sadece admin)
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'full_name', 'role', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
    }
});

module.exports = router;
