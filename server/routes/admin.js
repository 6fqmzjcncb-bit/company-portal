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

// Tüm personeli kullanıcıya dönüştür
router.post('/users/sync-from-employees', requireAdmin, async (req, res) => {
    try {
        const employees = await Employee.findAll({
            where: {
                is_active: true,
                user_id: null // Sadece kullanıcısı olmayanlar
            }
        });

        let createdCount = 0;
        let errors = [];

        for (const emp of employees) {
            try {
                // Username generation: "Ahmet Demir" -> "ahmet.demir"
                let baseUsername = emp.full_name
                    .toLowerCase()
                    .replace(/ğ/g, 'g')
                    .replace(/ü/g, 'u')
                    .replace(/ş/g, 's')
                    .replace(/ı/g, 'i')
                    .replace(/ö/g, 'o')
                    .replace(/ç/g, 'c')
                    .replace(/[^a-z0-9]/g, '.')
                    .replace(/\.+/g, '.')
                    .replace(/^\.|\.+$/g, '');

                let username = baseUsername;
                let counter = 1;

                // Ensure unique username
                while (await User.findOne({ where: { username } })) {
                    username = `${baseUsername}${counter}`;
                    counter++;
                }

                // Default password
                const password = await bcrypt.hash('123456', 10);

                const user = await User.create({
                    username,
                    password,
                    full_name: emp.full_name,
                    role: 'staff'
                });

                // Link employee to user
                await emp.update({ user_id: user.id });
                createdCount++;

            } catch (err) {
                console.error(`Error creating user for ${emp.full_name}:`, err);
                errors.push(`${emp.full_name}: ${err.message}`);
            }
        }

        res.json({
            success: true,
            message: `${createdCount} kullanıcı oluşturuldu.`,
            details: errors.length > 0 ? errors : null
        });

    } catch (error) {
        console.error('Sync users error:', error);
        res.status(500).json({ error: 'İşlem sırasında hata oluştu' });
    }
});

module.exports = router;
