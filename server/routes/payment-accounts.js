const express = require('express');
const router = express.Router();
const { PaymentAccount } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// List all accounts
router.get('/', requireAuth, async (req, res) => {
    try {
        const accounts = await PaymentAccount.findAll({
            order: [['name', 'ASC']]
        });
        res.json(accounts);
    } catch (error) {
        console.error('Account fetch error:', error);
        res.status(500).json({ error: 'Hesaplar getirilemedi' });
    }
});

// Add new account (Admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, type, icon } = req.body;
        const account = await PaymentAccount.create({ name, type, icon });
        res.status(201).json(account);
    } catch (error) {
        console.error('Account create error:', error);
        res.status(500).json({ error: 'Hesap oluşturulamadı' });
    }
});

// Delete account (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        await PaymentAccount.destroy({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Account delete error:', error);
        res.status(500).json({ error: 'Hesap silinemedi' });
    }
});

module.exports = router;
