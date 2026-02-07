const express = require('express');
const router = express.Router();
const { Source } = require('../models');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

// Tüm kaynakları listele (view_sources veya manage_stock yetkisi)
// Not: requirePermission tek bir yetki kontrol eder. Şimdilik view_sources diyelim.
// Ancak Stok Sorumlusu 'manage_stock' ve 'view_sources' alacak.
router.get('/', requirePermission('view_sources'), async (req, res) => {
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

// Yeni kaynak ekle (view_sources yetkisi)
router.post('/', requirePermission('view_sources'), async (req, res) => {
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

// Kaynak güncelle (view_sources yetkisi)
router.put('/:id', requirePermission('view_sources'), async (req, res) => {
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

// Kaynak sil (view_sources yetkisi)
router.delete('/:id', requirePermission('view_sources'), async (req, res) => {
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
}); console.error('Source delete error:', error);
res.status(500).json({ error: 'Kaynak silinemedi' });
    }
});

module.exports = router;
