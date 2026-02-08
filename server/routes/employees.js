const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Employee, Attendance, SalaryPayment, User, Role, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');

// Tüm personeli listele
router.get('/force-db-sync', async (req, res) => {
    try {
        await sequelize.sync({ alter: true });
        res.json({ message: 'Database synced!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Tüm personeli listele
router.get('/', requireAuth, async (req, res) => {
    try {
        let whereClause = {};

        // Access Control: If not admin, only show own record
        if (req.session.userRole !== 'admin') {
            if (req.session.employeeId) {
                whereClause.id = req.session.employeeId;
            } else {
                // If staff but no linked employee, show nothing? or all? 
                // Security-wise, show nothing.
                return res.json([]);
            }
        }

        const employees = await Employee.findAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'user',
                attributes: ['username', 'is_active']
            }],
            order: [['is_active', 'DESC'], ['full_name', 'ASC']]
        });
        res.json(employees);
    } catch (error) {
        console.error('Personel listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel detayı getir
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [
                {
                    model: Attendance,
                    as: 'attendances',
                    limit: 30,
                    order: [['date', 'DESC']]
                },
                {
                    model: SalaryPayment,
                    as: 'payments',
                    order: [['payment_date', 'DESC']]
                }
            ]
        });

        if (!employee) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Personel detay hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Yeni personel ekle
// Yeni personel ekle
router.post('/', requireAuth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { full_name, role_id } = req.body;

        // 1. Create Employee
        const employee = await Employee.create(req.body, { transaction: t });

        // 2. Generate Username
        let baseUsername = full_name
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
        while (await User.findOne({ where: { username }, transaction: t })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // 3. Create User (Random Password)
        const generatePassword = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let pass = '';
            for (let i = 0; i < 8; i++) {
                pass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return pass;
        };

        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        console.log('📝 Creating Employee User with role_id:', role_id); // DEBUG

        // If role_id is not provided, default to 'Personel' system role
        let finalRoleId = role_id ? parseInt(role_id) : null;
        if (!finalRoleId) {
            const defaultRole = await Role.findOne({ where: { name: 'Personel' } });
            if (defaultRole) {
                finalRoleId = defaultRole.id;
            }
        }

        const user = await User.create({
            username,
            password: hashedPassword,
            full_name: full_name,
            role_id: finalRoleId,
            role: 'staff' // Legacy fallback
        }, { transaction: t });

        // 4. Link Employee -> User
        await employee.update({ user_id: user.id }, { transaction: t });

        await t.commit();

        // Return employee with created user info for display
        const employeeData = employee.toJSON();
        employeeData.createdUser = {
            username: username,
            password: plainPassword // Show the generated password once
        };

        res.status(201).json(employeeData);

    } catch (error) {
        await t.rollback();
        console.error('Personel ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
});

// Personel güncelle
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);

        if (!employee) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        await employee.update(req.body);

        // Update Linked User Role if provided
        if (req.body.role_id && employee.user_id) {
            const user = await User.findByPk(employee.user_id);
            if (user) {
                await user.update({ role_id: parseInt(req.body.role_id) });
            }
        }

        res.json(employee);
    } catch (error) {
        console.error('Personel güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel sil (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);

        if (!employee) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        await employee.update({
            is_active: false,
            termination_date: new Date()
        });

        if (employee.user_id) {
            const user = await User.findByPk(employee.user_id);
            if (user) {
                await user.update({ is_active: false });
            }
        }

        res.json({ message: 'Personel pasif hale getirildi ve erişimi kapatıldı' });
    } catch (error) {
        console.error('Personel silme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel tekrar aktif et (Re-hire)
router.post('/:id/reactivate', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);

        if (!employee) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        const updates = {
            is_active: true,
            termination_date: null // Clear termination date
        };

        // If wages provided, update them
        if (req.body.daily_wage !== undefined) updates.daily_wage = req.body.daily_wage;
        if (req.body.monthly_salary !== undefined) updates.monthly_salary = req.body.monthly_salary;

        // Optionally reset hire_date to now if requested? Usually keeping original history is better, 
        // but user might want a new 'start_date' for salary calculation.
        // Let's set start_date to today for new accrual period if the user explicitly wants to reset it.
        // For now, let's just reset start_date (accrual start) to today so calculations start fresh.
        updates.start_date = new Date();

        await employee.update(updates);

        if (employee.user_id) {
            const user = await User.findByPk(employee.user_id);
            if (user) {
                await user.update({ is_active: true });
            }
        }

        res.json({ message: 'Personel tekrar aktif edildi' });
    } catch (error) {
        console.error('Personel aktif etme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
