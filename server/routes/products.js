const express = require('express');
const router = express.Router();
const { Product } = require('../models');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');
const { Op } = require('sequelize');

// Tüm ürünleri listele
router.get('/', requireAuth, async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['name', 'ASC']]
        });

        // Eğer kullanıcı admin değilse stok miktarını gizle
        if (req.session.userRole !== 'admin') {
            const productsWithoutStock = products.map(p => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                created_at: p.created_at
            }));
            return res.json(productsWithoutStock);
        }

        res.json(products);
    } catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ error: 'Ürünler getirilemedi' });
    }
});

// Ürün ara
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q } = req.query;

        let whereClause = {};
        if (q && q.trim().length > 0) {
            whereClause = {
                [Op.or]: [
                    { name: { [Op.like]: `%${q}%` } },
                    { barcode: { [Op.like]: `%${q}%` } }
                ]
            };
        }

        const products = await Product.findAll({
            where: whereClause,
            limit: 20,
            order: [['name', 'ASC']]
        });

        // Admin değilse stok bilgisini gizle
        if (req.session.userRole !== 'admin') {
            const productsWithoutStock = products.map(p => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode
            }));
            return res.json(productsWithoutStock);
        }

        res.json(products);
    } catch (error) {
        console.error('Product search error:', error);
        res.status(500).json({ error: 'Arama yapılamadı' });
    }
});

// Yeni ürün ekle (sadece manage_stock yetkisi olanlar)
router.post('/', requirePermission('manage_stock'), async (req, res) => {
    try {
        const { name, barcode, current_stock } = req.body;

        const product = await Product.create({
            name,
            barcode: barcode || null,
            current_stock: current_stock || 0
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Product create error:', error);
        res.status(500).json({ error: 'Ürün oluşturulamadı' });
    }
});

// Ürün güncelle (sadece manage_stock yetkisi olanlar)
router.put('/:id', requirePermission('manage_stock'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, barcode, current_stock } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        await product.update({ name, barcode, current_stock });
        res.json(product);
    } catch (error) {
        console.error('Product update error:', error);
        res.status(500).json({ error: 'Ürün güncellenemedi' });
    }
});

// Ürün sil (sadece manage_stock yetkisi olanlar)
router.delete('/:id', requirePermission('manage_stock'), async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        await product.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Product delete error:', error);
        res.status(500).json({ error: 'Ürün silinemedi' });
    }
});

module.exports = router;
