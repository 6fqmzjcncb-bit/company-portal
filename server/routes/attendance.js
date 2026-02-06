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

        // Access Control: Enforce own data for non-admins
        if (req.session.userRole !== 'admin') {
            if (!req.session.employeeId) {
                return res.json([]); // No linked employee, no data
            }
            whereClause.employee_id = req.session.employeeId;
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
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            whereClause.date = {
                [Op.between]: [firstDay, lastDay]
            };
        }

        // Fetch RAW records instead of using GROUP BY (safer)
        const attendances = await Attendance.findAll({
            where: whereClause,
            attributes: ['employee_id', 'hours_worked']
        });

        // Fetch active employees
        let employeeWhere = { is_active: true };

        // Access Control: Filter employees for summary
        if (req.session.userRole !== 'admin') {
            if (!req.session.employeeId) {
                return res.json([]);
            }
            employeeWhere.id = req.session.employeeId;
        }

        const employees = await Employee.findAll({ where: employeeWhere });

        // Aggregate in Memory
        const summaryMap = {};
        attendances.forEach(record => {
            if (!summaryMap[record.employee_id]) {
                summaryMap[record.employee_id] = { days: 0, overtime: 0 };
            }
            summaryMap[record.employee_id].days += 1;
            summaryMap[record.employee_id].overtime += parseFloat(record.hours_worked || 0);
        });

        const result = employees.map(emp => {
            const stats = summaryMap[emp.id] || { days: 0, overtime: 0 };
            return {
                employee_id: emp.id,
                full_name: emp.full_name,
                role: emp.role,
                total_days: stats.days,
                total_overtime: Number(stats.overtime.toFixed(2)) // Round to 2 decimals
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Özet tablosu hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
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
