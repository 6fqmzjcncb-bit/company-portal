const express = require('express');
const router = express.Router();
const { Unit } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// GET /api/units
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const units = await Unit.findAll({
            order: [['name', 'ASC']]
        });
        res.json(units);
    } catch (error) {
        console.error('Birimler getirilemedi:', error);
        res.status(500).json({ error: 'Birimler getirilemedi' });
    }
});

// POST /api/units
router.post('/', isAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Birim adı zorunludur' });
        }

        // Benzersizlik kontrolü
        const existing = await Unit.findOne({ where: { name: name.trim() } });
        if (existing) {
            return res.status(400).json({ error: 'Bu birim zaten mevcut' });
        }

        const unit = await Unit.create({ name: name.trim() });
        res.status(201).json(unit);
    } catch (error) {
        console.error('Birim eklenemedi:', error);
        res.status(500).json({ error: 'Birim eklenemedi' });
    }
});

// DELETE /api/units/:id
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const unit = await Unit.findByPk(id);

        if (!unit) {
            return res.status(404).json({ error: 'Birim bulunamadı' });
        }

        await unit.destroy();
        res.json({ message: 'Birim başarıyla silindi' });
    } catch (error) {
        console.error('Birim silinemedi:', error);
        res.status(500).json({ error: 'Birim silinirken bir hata oluştu' });
    }
});

module.exports = router;
