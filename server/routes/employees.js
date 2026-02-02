const express = require('express');
const router = express.Router();
const { Employee, Attendance, SalaryPayment } = require('../models');
const { requireAuth } = require('../middleware/auth');

// Tüm personeli listele
router.get('/', requireAuth, async (req, res) => {
    try {
        const employees = await Employee.findAll({
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
router.post('/', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.create(req.body);
        res.status(201).json(employee);
    } catch (error) {
        console.error('Personel ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
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
