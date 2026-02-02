const express = require('express');
const router = express.Router();
const { Source } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Tüm kaynakları listele
router.get('/', requireAuth, async (req, res) => {
    try {
        const sources = await Source.findAll({
            order: [['name', 'ASC']]
        });
        res.json(sources);
    } catch (error) {
        console.error('Sources fetch error:', error);
        res.status(500).json({ error: 'Kaynaklar getirilemedi' });
    }
});

// Yeni kaynak ekle (sadece admin)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, color_code, type } = req.body;

        const source = await Source.create({
            name,
            color_code,
            type
        });

        res.status(201).json(source);
    } catch (error) {
        console.error('Source create error:', error);
        res.status(500).json({ error: 'Kaynak oluşturulamadı' });
    }
});

// Kaynak güncelle (sadece admin)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color_code, type } = req.body;

        const source = await Source.findByPk(id);

        if (!source) {
            return res.status(404).json({ error: 'Kaynak bulunamadı' });
        }

        await source.update({ name, color_code, type });
        res.json(source);
    } catch (error) {
        console.error('Source update error:', error);
        res.status(500).json({ error: 'Kaynak güncellenemedi' });
    }
});

// Kaynak sil (sadece admin)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const source = await Source.findByPk(id);

        if (!source) {
            return res.status(404).json({ error: 'Kaynak bulunamadı' });
        }

        await source.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Source delete error:', error);
        res.status(500).json({ error: 'Kaynak silinemedi' });
    }
});

module.exports = router;
