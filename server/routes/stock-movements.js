const express = require('express');
const router = express.Router();
const { StockMovement, Product, JobList, Source } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

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
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
});

// Stok giriş kaydı
router.post('/in', requireAuth, async (req, res) => {
    let t;
    try {
        t = await sequelize.transaction();
        const { product_id, quantity, brought_by, source_location, notes, movement_date } = req.body;

        if (!product_id || !quantity) {
            throw new Error('Ürün ID ve miktar gereklidir.');
        }

        // If a new source_location is provided, automatically add it to the sources table for future use
        if (source_location && source_location.trim() !== '') {
            const existingSource = await Source.findOne({
                where: { name: source_location.trim() },
                transaction: t
            });

            if (!existingSource) {
                await Source.create({
                    name: source_location.trim(),
                    color_code: 'bg-blue-100', // Default styling
                    type: 'external'           // Default type
                }, { transaction: t });
            }
        }

        // Prepare movement data
        const movementData = {
            product_id,
            movement_type: 'IN',
            quantity,
            brought_by,
            source_location,
            notes,
            created_by: req.session.userId
        };

        // If custom date provided, use it as created_at AND updated_at
        if (movement_date) {
            const customDate = new Date(movement_date);
            movementData.created_at = customDate;
            movementData.updated_at = customDate;
            console.log('Setting custom date:', customDate);
        }

        // Hareketi kaydet - explicitly include created_at/updated_at in fields
        const movement = await StockMovement.create(movementData, {
            transaction: t,
            fields: movement_date ?
                ['product_id', 'movement_type', 'quantity', 'brought_by', 'source_location', 'notes', 'created_by', 'created_at', 'updated_at'] :
                ['product_id', 'movement_type', 'quantity', 'brought_by', 'source_location', 'notes', 'created_by']
        });

        console.log('Created movement:', movement.id, 'with created_at:', movement.created_at);

        // Stoğu artır
        const product = await Product.findByPk(product_id, { transaction: t });

        if (product) {
            await product.update({
                current_stock: parseFloat(product.current_stock) + parseFloat(quantity)
            }, { transaction: t });
        } else {
            throw new Error('Ürün bulunamadı (ID: ' + product_id + ')');
        }

        await t.commit();
        res.status(201).json(movement);
    } catch (error) {
        if (t) await t.rollback();
        console.error('Stok giriş hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stok çıkış kaydı
router.post('/out', requireAuth, async (req, res) => {
    let t;
    try {
        t = await sequelize.transaction();
        const { product_id, quantity, taken_by, destination, job_id, reason, notes, movement_date } = req.body;

        if (!product_id || !quantity) {
            throw new Error('Ürün ID ve miktar gereklidir.');
        }

        // Yeterli stok kontrolü
        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback(); // Rollback explicitly here if we return early, though throw is safer
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        if (parseFloat(product.current_stock) < parseFloat(quantity)) {
            await t.rollback();
            return res.status(400).json({ error: 'Yetersiz stok. Mevcut: ' + product.current_stock });
        }

        // Prepare movement data
        const movementData = {
            product_id,
            movement_type: 'OUT',
            quantity,
            taken_by,
            destination,
            job_id,
            reason,
            notes,
            created_by: req.session.userId
        };

        // If custom date provided, use it as created_at AND updated_at
        if (movement_date) {
            const customDate = new Date(movement_date);
            movementData.created_at = customDate;
            movementData.updated_at = customDate;
            console.log('Setting custom date:', customDate);
        }

        // Hareketi kaydet - explicitly include created_at/updated_at in fields
        const movement = await StockMovement.create(movementData, {
            transaction: t,
            fields: movement_date ?
                ['product_id', 'movement_type', 'quantity', 'taken_by', 'destination', 'job_id', 'reason', 'notes', 'created_by', 'created_at', 'updated_at'] :
                ['product_id', 'movement_type', 'quantity', 'taken_by', 'destination', 'job_id', 'reason', 'notes', 'created_by']
        });

        console.log('Created movement:', movement.id, 'with created_at:', movement.created_at);

        // Stoğu azalt
        await product.update({
            current_stock: parseFloat(product.current_stock) - parseFloat(quantity)
        }, { transaction: t });

        await t.commit();
        res.status(201).json(movement);
    } catch (error) {
        if (t) await t.rollback();
        console.error('Stok çıkış hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stok düzenleme (manuel ayarlama)
router.post('/adjust', requireAuth, async (req, res) => {
    let t;
    try {
        t = await sequelize.transaction();
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
        if (t) await t.rollback();
        console.error('Stok düzenleme hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
