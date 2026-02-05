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



// GET /balance - Tüm personel bakiyelerini getir
router.get('/balance', requireAuth, async (req, res) => {
    try {
        const employees = await Employee.findAll({ where: { is_active: true } });

        const balances = [];
        for (const emp of employees) {
            // 1. Toplam Hak Ediş (Maaş/Yevmiye)
            let totalAccrued = 0;
            let totalWorkedDays = 0;
            let startDate = null;

            const attendances = await Attendance.findAll({
                where: { employee_id: emp.id, worked: true },
                order: [['date', 'ASC']]
            });

            if (attendances.length > 0) {
                startDate = attendances[0].date;
                totalWorkedDays = attendances.length;
            }

            if (emp.daily_wage) {
                totalAccrued = totalWorkedDays * parseFloat(emp.daily_wage);

                // Mesai
                const totalOvertimeHours = attendances.reduce((sum, a) => sum + (parseFloat(a.hours_worked) || 0), 0);
                const hourlyRate = parseFloat(emp.daily_wage) / 9;
                totalAccrued += totalOvertimeHours * hourlyRate;
            } else if (emp.monthly_salary) {
                totalAccrued = (parseFloat(emp.monthly_salary) / 30) * totalWorkedDays;
            }

            // 2. İşlemler
            const payments = await SalaryPayment.findAll({
                where: { employee_id: emp.id }
            });

            const totalPaid = payments
                .filter(p => p.transaction_type === 'payment')
                .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

            const totalExpense = payments
                .filter(p => p.transaction_type === 'expense')
                .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

            const totalReimbursement = payments
                .filter(p => p.transaction_type === 'reimbursement')
                .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

            // Bakiye = (Hakediş + Alacaklar) - (Ödemeler + Kesintiler)
            const currentBalance = (totalAccrued + totalReimbursement) - (totalPaid + totalExpense);

            balances.push({
                id: emp.id,
                full_name: emp.full_name,
                daily_wage: emp.daily_wage,
                start_date: startDate,
                total_worked_days: totalWorkedDays,
                total_accrued: totalAccrued,
                total_paid: totalPaid,
                total_expense: totalExpense,
                total_reimbursement: totalReimbursement,
                current_balance: currentBalance
            });
        }

        res.json(balances);
    } catch (error) {
        console.error('Bakiye hesaplama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// POST /pay - Ödeme veya Harcama Ekle (Esnek)
router.post('/pay', requireAuth, async (req, res) => {
    try {
        const {
            employee_id,
            amount_paid,
            transaction_type, // 'payment' or 'expense'
            account,          // 'cash', 'bank'
            notes,
            payment_date
        } = req.body;

        const payment = await SalaryPayment.create({
            employee_id,
            amount_paid,
            transaction_type: transaction_type || 'payment',
            account: account || 'cash',
            notes,
            payment_date: payment_date || new Date(),
            created_by: req.session.userId,
            // Opsiyonel alanlar boş kalabilir
            days_worked: 0,
            total_hours: 0
        });

        res.status(201).json(payment);
    } catch (error) {
        console.error('İşlem kaydı hatası:', error);
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

// GET /payments - Son işlemleri getir
router.get('/payments', requireAuth, async (req, res) => {
    try {
        const payments = await SalaryPayment.findAll({
            include: [{
                model: Employee,
                attributes: ['full_name']
            }],
            order: [['payment_date', 'DESC']],
            limit: 20
        });
        res.json(payments);
    } catch (error) {
        console.error('Geçmiş yükleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
