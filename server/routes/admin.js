const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User, Product, Employee, Role } = require('../models');
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

// Kullanıcı sil (sadece admin)
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        if (user.id === req.session.userId) {
            return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
        }

        // Eğer kullanıcı bir personele bağlıysa, personelin user_id'sini null yap
        if (user.role === 'admin') {
            // Admin silinirken ekstra kontrol gerekebilir ama şimdilik izin veriyoruz
        }

        await Employee.update({ user_id: null }, { where: { user_id: id } });
        await user.destroy();

        res.json({ message: 'Kullanıcı silindi' });
    } catch (error) {
        console.error('User delete error:', error);
        res.status(500).json({ error: 'Kullanıcı silinemedi' });
    }
});

// Yeni kullanıcı ekle (sadece admin)
router.post('/users', requireAdmin, async (req, res) => {
    try {
        console.log('📝 Creating User Payload:', req.body); // DEBUG
        const { username, password, full_name, role_id } = req.body;

        if (!role_id) {
            console.warn('⚠️ No role_id provided for user creation!');
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            password: hashedPassword,
            full_name,
            role_id: role_id ? parseInt(role_id) : null,
            role: 'staff' // Legacy fallback, but role_id should take precedence in logic
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('User create error:', error);
        res.status(500).json({ error: 'Kullanıcı oluşturulamadı' });
    }
});

// Tüm kullanıcıları listele (sadece admin)
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { Role } = require('../models');
        const users = await User.findAll({
            attributes: ['id', 'username', 'full_name', 'role', 'role_id', 'created_at', 'is_active'],
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'full_name']
                },
                {
                    model: Role,
                    as: 'userRole',
                    attributes: ['id', 'name']
                }
            ],
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

// Sync and Fix Users Route
router.get('/debug/sync-users-fix', async (req, res) => {
    try {
        // 1. Fetch System Roles (Using top-level Role model)
        const adminRole = await Role.findOne({ where: { name: 'Yönetici' } });
        const staffRole = await Role.findOne({ where: { name: 'Personel' } });

        if (!adminRole || !staffRole) {
            return res.status(500).json({ error: 'Sistem rolleri (Yönetici, Personel) bulunamadı. Lütfen sunucuyu yeniden başlatın.' });
        }

        let logs = [];

        // 2. Fix Existing Users with Legacy Roles
        const users = await User.findAll();
        for (const user of users) {
            let shouldSave = false;

            // Logic: Map legacy string roles to new Role IDs
            if (user.username === 'admin' || user.role === 'admin') {
                if (user.role_id !== adminRole.id) {
                    user.role_id = adminRole.id;
                    shouldSave = true;
                    logs.push(`✅ Fixed Admin: ${user.username}`);
                }
            } else if (user.username === 'staff' || user.role === 'staff') {
                if (user.role_id !== staffRole.id) {
                    user.role_id = staffRole.id;
                    shouldSave = true;
                    logs.push(`✅ Fixed Staff: ${user.username}`);
                }
            }

            if (shouldSave) {
                await user.save();
            }
        }

        // 3. Create Users for Employees who don't have one
        const employees = await Employee.findAll({
            where: { is_active: true }
        });

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
                username,
                password,
                full_name: emp.full_name,
                role_id: staffRole.id, // Assign Personel role by default
                role: 'staff',
                is_active: true
            });

            await emp.update({ user_id: user.id });
            logs.push(`✨ Created User for Employee: ${emp.full_name} -> ${username}`);
        }

        res.json({ message: 'Sync complete', logs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Diagnostic Route
router.get('/debug/diagnose-roles', async (req, res) => {
    try {
        const { Role } = require('../models');
        const roles = await Role.findAll();
        const users = await User.findAll({
            attributes: ['id', 'username', 'role_id', 'role']
        });

        let associationTest = null;
        const admin = await User.findOne({
            where: { username: 'admin' },
            include: [{ model: Role, as: 'userRole' }]
        });

        if (admin) {
            associationTest = {
                username: admin.username,
                role_id: admin.role_id,
                userRole: admin.userRole,
                role_enum: admin.role
            };
        }

        res.json({
            roles,
            users,
            associationTest
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

module.exports = router;
