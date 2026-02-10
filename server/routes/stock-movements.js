const express = require('express');
const router = express.Router();
const { StockMovement, Product, JobList } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Stok hareketlerini listele
router.get('/', requireAuth, async (req, res) => {
    try {
        const { product_id, type, start_date, end_date } = req.query;

        let whereClause = {};

        if (product_id) {
            whereClause.product_id = product_id;
        }

        if (type) {
            whereClause.movement_type = type;
        }

        if (start_date && end_date) {
            whereClause.created_at = {
                [Op.between]: [start_date, end_date]
            };
        }

        const movements = await StockMovement.findAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: JobList,
                    as: 'job',
                    required: false
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json(movements);
    } catch (error) {
        console.error('Stok hareket listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Stok giriş kaydı
router.post('/in', requireAuth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { product_id, quantity, brought_by, source_location, notes } = req.body;

        // Hareketi kaydet
        const movement = await StockMovement.create({
            product_id,
            movement_type: 'IN',
            quantity,
            brought_by,
            source_location,
            notes,
            created_by: req.session.userId
        }, { transaction: t });

        // Stoğu artır
        const product = await Product.findByPk(product_id, { transaction: t });

        if (product) {
            await product.update({
                current_stock: parseFloat(product.current_stock) + parseFloat(quantity)
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json(movement);
    } catch (error) {
        await t.rollback();
        console.error('Stok giriş hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Stok çıkış kaydı
router.post('/out', requireAuth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { product_id, quantity, taken_by, destination, job_id, reason, notes } = req.body;

        // Yeterli stok kontrolü
        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        if (parseFloat(product.current_stock) < parseFloat(quantity)) {
            await t.rollback();
            return res.status(400).json({ error: 'Yetersiz stok' });
        }

        // Hareketi kaydet
        const movement = await StockMovement.create({
            product_id,
            movement_type: 'OUT',
            quantity,
            taken_by,
            destination,
            job_id,
            reason,
            notes,
            created_by: req.session.userId
        }, { transaction: t });

        // Stoğu azalt
        await product.update({
            current_stock: parseFloat(product.current_stock) - parseFloat(quantity)
        }, { transaction: t });

        await t.commit();
        res.status(201).json(movement);
    } catch (error) {
        await t.rollback();
        console.error('Stok çıkış hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Stok düzenleme (manuel ayarlama)
router.post('/adjust', requireAuth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { product_id, new_quantity, reason, notes } = req.body;

        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        const oldQuantity = parseFloat(product.current_stock);
        const difference = parseFloat(new_quantity) - oldQuantity;

        // Hareketi kaydet
        const movement = await StockMovement.create({
            product_id,
            movement_type: 'ADJUSTMENT',
            quantity: Math.abs(difference),
            reason: reason || `Düzenleme: ${oldQuantity} -> ${new_quantity}`,
            notes,
            created_by: req.session.userId
        }, { transaction: t });

        // Stoğu güncelle
        await product.update({
            current_stock: new_quantity
        }, { transaction: t });

        await t.commit();
        res.status(201).json(movement);
    } catch (error) {
        await t.rollback();
        console.error('Stok düzenleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
