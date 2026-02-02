const express = require('express');
const router = express.Router();
const { SalaryPayment, Employee, Attendance } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// Maaş hesaplama (dönem için)
router.get('/calculate', requireAuth, async (req, res) => {
    try {
        const { employee_id, start_date, end_date } = req.query;

        if (!employee_id || !start_date || !end_date) {
            return res.status(400).json({ error: 'employee_id, start_date ve end_date gerekli' });
        }

        const employee = await Employee.findByPk(employee_id);
        if (!employee) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        // Dönemdeki çalışma kayıtlar ını getir
        const attendances = await Attendance.findAll({
            where: {
                employee_id,
                date: {
                    [Op.between]: [start_date, end_date]
                },
                worked: true
            }
        });

        const daysWorked = attendances.length;
        const totalHours = attendances.reduce((sum, att) => sum + (parseFloat(att.hours_worked) || 0), 0);

        // Maaş hesapla
        let amountCalculated = 0;
        if (employee.monthly_salary) {
            // Aylık maaşlı ise
            amountCalculated = parseFloat(employee.monthly_salary);
        } else if (employee.daily_wage) {
            // Günlük ücretli ise
            amountCalculated = parseFloat(employee.daily_wage) * daysWorked;
        }

        res.json({
            employee_id,
            employee_name: employee.full_name,
            period_start: start_date,
            period_end: end_date,
            days_worked: daysWorked,
            total_hours: totalHours,
            amount_calculated: amountCalculated,
            calculation_type: employee.monthly_salary ? 'monthly' : 'daily'
        });
    } catch (error) {
        console.error('Maaş hesaplama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Ödeme geçmişi
router.get('/payments', requireAuth, async (req, res) => {
    try {
        const { employee_id } = req.query;

        let whereClause = {};
        if (employee_id) {
            whereClause.employee_id = employee_id;
        }

        const payments = await SalaryPayment.findAll({
            where: whereClause,
            include: [{
                model: Employee,
                as: 'employee'
            }],
            order: [['period_start', 'DESC']]
        });

        res.json(payments);
    } catch (error) {
        console.error('Ödeme listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Maaş ödemesi kaydet
router.post('/pay', requireAuth, async (req, res) => {
    try {
        const { employee_id, period_start, period_end, days_worked, total_hours, amount_paid, payment_date, notes } = req.body;

        const payment = await SalaryPayment.create({
            employee_id,
            period_start,
            period_end,
            days_worked,
            total_hours,
            amount_paid,
            payment_date: payment_date || new Date(),
            notes,
            created_by: req.session.userId
        });

        res.status(201).json(payment);
    } catch (error) {
        console.error('Maaş ödeme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Ödeme silme
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const payment = await SalaryPayment.findByPk(req.params.id);

        if (!payment) {
            return res.status(404).json({ error: 'Ödeme kaydı bulunamadı' });
        }

        await payment.destroy();
        res.json({ message: 'Ödeme kaydı silindi' });
    } catch (error) {
        console.error('Ödeme silme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
