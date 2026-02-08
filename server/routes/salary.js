const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Employee, SalaryPayment, Attendance } = require('../models');
const { requireAuth } = require('../middleware/auth');
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
        const showArchived = req.query.showArchived === 'true';
        const whereClause = showArchived ? {} : { is_active: true }; // If archived requested, show all (active & inactive), else only active

        // Or if specific requirement is to ONLY show archived when toggled?
        // Usually "Show Archived" means include them. Or toggle between "Active Only" and "All" or "Archived Only".
        // Let's assume toggle means "Include Archived" (Show All). 
        // Wait, user said "Archive view". Usually better to show just archived or mixed.
        // Let's make it: if showArchived=true, show ALL. If false, show ACTIVE.

        const employees = await Employee.findAll({ where: whereClause });

        const balances = [];
        for (const emp of employees) {
            // 1. Toplam Hak Ediş (Maaş/Yevmiye)
            let totalAccrued = 0;
            let totalWorkedDays = 0;

            // Sıfırlama tarihi (Varsayılan: En baş)
            // start_date varsa, o tarihten SONRAKİ (veya o tarihli) çalışmaları alır
            const filterDate = emp.start_date ? emp.start_date : '2000-01-01';

            const attendances = await Attendance.findAll({
                where: {
                    employee_id: emp.id,
                    worked: true,
                    date: { [Op.gte]: filterDate }
                },
                order: [['date', 'ASC']]
            });

            if (attendances.length > 0) {
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
                where: {
                    employee_id: emp.id,
                    payment_date: { [Op.gt]: filterDate } // GT (Greater Than) - Sıfırlama anındaki ödeme dahil edilmez!
                }
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
                is_active: emp.is_active, // Added for frontend filtering
                phone: emp.phone, // Added for modal display
                daily_wage: emp.daily_wage,
                start_date: emp.start_date,
                total_worked_days: totalWorkedDays,
                total_accrued: totalAccrued,
                total_paid: totalPaid,
                total_expense: totalExpense,
                total_reimbursement: totalReimbursement,
                current_balance: currentBalance,
                termination_date: emp.termination_date
            });
        }

        res.json(balances);
    } catch (error) {
        console.error('Bakiye hesaplama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// POST /pay - Ödeme veya Harcama Ekle (Esnek)
// POST /pay - Ödeme veya Harcama Ekle
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

        const emp = await Employee.findByPk(employee_id);
        if (!emp) return res.status(404).json({ error: 'Personel bulunamadı' });

        const pDate = payment_date ? new Date(payment_date) : new Date();
        let daysWorked = 0;

        if (transaction_type === 'payment') {
            // Ödeme yapılıyorsa:
            // 1. Bugüne kadar (veya ödeme tarihine kadar) kaç gün çalışmış hesapla
            const filterDate = emp.start_date ? emp.start_date : '2000-01-01';

            // Eğer payment_date, start_date'den gerideyse hata olmasın, sadece o aralığı alalım.
            // Ama mantıken start_date <= çalışma <= payment_date olmalı.

            const attendances = await Attendance.findAll({
                where: {
                    employee_id,
                    worked: true,
                    date: {
                        [Op.gte]: filterDate,
                        [Op.lte]: pDate // Ödeme tarihine kadar olanları say
                    }
                }
            });
            daysWorked = attendances.length;

            // 2. Personelin "Başlangıç Tarihi"ni (son ödeme tarihi) güncelle
            // Böylece bir sonraki hesaplama bu tarihten sonrasını baz alır.
            emp.start_date = pDate;
            await emp.save();
        }

        const payment = await SalaryPayment.create({
            employee_id,
            amount_paid,
            transaction_type: transaction_type || 'payment',
            account: account || 'cash',
            notes,
            payment_date: pDate,
            created_by: req.session.userId,
            days_worked: daysWorked,
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
                as: 'employee',
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
