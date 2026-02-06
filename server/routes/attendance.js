const express = require('express');
const router = express.Router();
const { Attendance, Employee } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

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

// Özet Tablosu (Toplam Çalışma Günleri)
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let whereClause = { worked: true };

        if (start_date && end_date) {
            whereClause.date = {
                [Op.between]: [start_date, end_date]
            };
        } else {
            // Default to current month if no dates provided
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
            whereClause.date = {
                [Op.between]: [firstDay, lastDay]
            };
        }

        // Get aggregation
        const summary = await Attendance.findAll({
            attributes: [
                'employee_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_days'],
                [sequelize.fn('SUM', sequelize.col('hours_worked')), 'total_overtime']
            ],
            where: whereClause,
            group: ['employee_id']
        });

        // We need employee details as well. Since group by might interfere with include in some SQL dialects or Sequelize versions if not careful,
        // let's just fetch active employees and map the data.
        const employees = await Employee.findAll({ where: { is_active: true } });

        const result = employees.map(emp => {
            const stats = summary.find(s => s.employee_id === emp.id);
            return {
                employee_id: emp.id,
                full_name: emp.full_name,
                role: emp.role,
                total_days: stats ? parseInt(stats.getDataValue('total_days')) : 0,
                total_overtime: stats ? parseFloat(stats.getDataValue('total_overtime') || 0) : 0
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Özet tablosu hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel bazlı çalışma geçmişi
router.get('/employee/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const attendances = await Attendance.findAll({
            where: { employee_id: id },
            order: [['date', 'DESC']]
        });
        res.json(attendances);
    } catch (error) {
        console.error('Personel geçmişi hatası:', error);
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
