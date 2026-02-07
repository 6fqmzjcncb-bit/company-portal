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

// Yeni ürün ekle (Admin veya Yetkili)
router.post('/', requirePermission('view_products'), async (req, res) => {
    try {
        const { name, stock, min_stock, unit } = req.body;
        const product = await Product.create({ name, stock, min_stock, unit });
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Ürün güncelle
router.put('/:id', requirePermission('view_products'), async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

        await product.update(req.body);
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Ürün sil
router.delete('/:id', requirePermission('view_products'), async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

        await product.destroy();
        res.json({ message: 'Ürün silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
