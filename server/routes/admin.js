const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User, Product, Employee } = require('../models');
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
            include: [{
                model: Employee,
                as: 'employee',
                attributes: ['id', 'full_name']
            }],
            order: [['created_at', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
    }
});

// Kullanıcıyı bir personele bağla
router.put('/users/:id/link-employee', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id } = req.body; // Linking to this employee ID (or null to unlink)

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Önce eski bağlantıyı kopar (Varsa)
        await Employee.update({ user_id: null }, { where: { user_id: id } });

        if (employee_id) {
            // Başka bir kullanıcıya bağlı mı kontrol et
            const existingLink = await Employee.findOne({
                where: {
                    id: employee_id,
                    user_id: { [require('sequelize').Op.ne]: null }
                }
            });

            if (existingLink) {
                return res.status(400).json({ error: 'Bu personel zaten başka bir kullanıcıya bağlı!' });
            }

            // Yeni bağlantıyı kur
            await Employee.update({ user_id: id }, { where: { id: employee_id } });
        }

        res.json({ success: true, message: 'Kullanıcı-Personel bağlantısı güncellendi' });
    } catch (error) {
        console.error('Link employee error:', error);
        res.status(500).json({ error: 'Bağlantı güncellenemedi' });
    }
});

// Kullanıcı şifresini güncelle (Admin reset)
router.put('/users/:id/password', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await user.update({ password: hashedPassword });

        res.json({ message: 'Şifre başarıyla güncellendi' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Şifre güncellenemedi' });
    }
});

// Kullanıcı erişimini aç/kapat (Toggle Access)
router.put('/users/:id/toggle-access', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body; // Expecting boolean

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Prevent disabling self?
        if (user.id === req.session.userId) {
            return res.status(400).json({ error: 'Kendi hesabınızı pasife alamazsınız' });
        }

        await user.update({ is_active });

        res.json({
            message: `Kullanıcı erişimi ${is_active ? 'açıldı' : 'kapatıldı'}`,
            user: { id: user.id, is_active: user.is_active }
        });
    } catch (error) {
        console.error('Toggle access error:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

// Temporary Sync Fix Route
router.get('/debug/sync-users-fix', async (req, res) => {
    try {
        // Ensure schema
        await User.sync({ alter: true });

        const employees = await Employee.findAll({
            where: { is_active: true }
        });

        let count = 0;
        for (const emp of employees) {
            if (emp.user_id) {
                const user = await User.findByPk(emp.user_id);
                if (user) continue; // Already has valid user
            }

            // Create User
            let baseUsername = emp.full_name.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.+$/g, '');

            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ where: { username } })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            const password = await bcrypt.hash('123456', 10);
            const user = await User.create({
                username, password, full_name: emp.full_name, role: 'staff', is_active: true
            });

            await emp.update({ user_id: user.id });
            count++;
        }
        res.json({ message: `Synced ${count} users` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
