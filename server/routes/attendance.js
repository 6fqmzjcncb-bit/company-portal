const express = require('express');
const router = express.Router();
const { Attendance, Employee } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// Tarihe göre çalışma kayıtları
router.get('/', requireAuth, async (req, res) => {
    try {
        const { date, employee_id, start_date, end_date } = req.query;

        let whereClause = {};

        if (date) {
            whereClause.date = date;
        } else if (start_date && end_date) {
            whereClause.date = {
                [Op.between]: [start_date, end_date]
            };
        }

        if (employee_id) {
            whereClause.employee_id = employee_id;
        }

        const attendances = await Attendance.findAll({
            where: whereClause,
            include: [{
                model: Employee,
                as: 'employee'
            }],
            order: [['date', 'DESC'], ['employee_id', 'ASC']]
        });

        res.json(attendances);
    } catch (error) {
        console.error('Çalışma kaydı listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Toplu çalışma kaydı ekle (günlük tüm personel için)
router.post('/bulk', requireAuth, async (req, res) => {
    try {
        const { date, records } = req.body;
        // records = [{ employee_id, worked, hours_worked, location, notes }]

        const attendanceRecords = records.map(record => ({
            ...record,
            date,
            created_by: req.session.userId
        }));

        const created = await Attendance.bulkCreate(attendanceRecords, {
            updateOnDuplicate: ['worked', 'hours_worked', 'location', 'notes', 'created_by']
        });

        res.status(201).json(created);
    } catch (error) {
        console.error('Toplu çalışma kaydı hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Tek çalışma kaydı ekle/güncelle
router.post('/', requireAuth, async (req, res) => {
    try {
        const { employee_id, date, worked, hours_worked, location, notes } = req.body;

        const [attendance, created] = await Attendance.upsert({
            employee_id,
            date,
            worked,
            hours_worked,
            location,
            notes,
            created_by: req.session.userId
        });

        res.status(created ? 201 : 200).json(attendance);
    } catch (error) {
        console.error('Çalışma kaydı ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Çalışma kaydı güncelle
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const attendance = await Attendance.findByPk(req.params.id);

        if (!attendance) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        await attendance.update(req.body);
        res.json(attendance);
    } catch (error) {
        console.error('Çalışma kaydı güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Çalışma kaydı sil
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const attendance = await Attendance.findByPk(req.params.id);

        if (!attendance) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        await attendance.destroy();
        res.json({ message: 'Kayıt silindi' });
    } catch (error) {
        console.error('Çalışma kaydı silme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
