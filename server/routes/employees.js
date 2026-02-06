const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Employee, Attendance, SalaryPayment, User, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');

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
                    order: [['period_start', 'DESC']]
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
        const { full_name } = req.body;

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

        // 3. Create User (Default password: 123456)
        const password = await bcrypt.hash('123456', 10);
        const user = await User.create({
            username,
            password,
            full_name: full_name,
            role: 'staff' // Default role
        }, { transaction: t });

        // 4. Link Employee -> User
        await employee.update({ user_id: user.id }, { transaction: t });

        await t.commit();
        res.status(201).json(employee);

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

        await employee.update({ is_active: false });
        res.json({ message: 'Personel pasif hale getirildi' });
    } catch (error) {
        console.error('Personel silme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
