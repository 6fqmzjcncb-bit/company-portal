const express = require('express');
const router = express.Router();
const { JobList, JobItem, Product, Source, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { sequelize } = require('../config/database');

// Tüm iş listelerini getir
router.get('/', requireAuth, async (req, res) => {
    try {
        const jobLists = await JobList.findAll({
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json(jobLists);
    } catch (error) {
        console.error('Job lists fetch error:', error);
        res.status(500).json({ error: 'İş listeleri getirilemedi' });
    }
});

// Tek iş listesi detay (kalemlerle birlikte, source'a göre gruplanmış)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const jobList = await JobList.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name']
                },
                {
                    model: JobItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'barcode']
                        },
                        {
                            model: Source,
                            as: 'source'
                        },
                        {
                            model: User,
                            as: 'checkedBy',
                            attributes: ['id', 'full_name']
                        }
                    ]
                }
            ]
        });

        if (!jobList) {
            return res.status(404).json({ error: 'İş listesi bulunamadı' });
        }

        // Kalemleri kaynağa göre grupla
        const itemsBySource = {};

        jobList.items.forEach(item => {
            const sourceId = item.source.id;
            if (!itemsBySource[sourceId]) {
                itemsBySource[sourceId] = {
                    source: item.source,
                    items: []
                };
            }
            itemsBySource[sourceId].items.push(item);
        });

        res.json({
            ...jobList.toJSON(),
            groupedItems: Object.values(itemsBySource)
        });
    } catch (error) {
        console.error('Job list detail error:', error);
        res.status(500).json({ error: 'İş listesi detayı getirilemedi' });
    }
});

// Yeni iş listesi oluştur
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title } = req.body;

        const jobList = await JobList.create({
            title,
            status: 'pending',
            created_by_user_id: req.session.userId
        });

        res.status(201).json(jobList);
    } catch (error) {
        console.error('Job list create error:', error);
        res.status(500).json({ error: 'İş listesi oluşturulamadı' });
    }
});

// İş listesine item ekle
router.post('/:id/items', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, custom_name, source_id, quantity } = req.body;

        // Validation: product_id veya custom_name birisi dolu olmalı
        if (!product_id && !custom_name) {
            return res.status(400).json({
                error: 'Stoktan ürün seçin veya özel isim girin'
            });
        }

        const item = await JobItem.create({
            job_list_id: id,
            product_id: product_id || null,
            custom_name: custom_name || null,
            source_id,
            quantity: quantity || 1,
            is_checked: false
        });

        // Oluşturulan item'ı ilişkileriyle birlikte getir
        const createdItem = await JobItem.findByPk(item.id, {
            include: [
                { model: Product, as: 'product' },
                { model: Source, as: 'source' }
            ]
        });

        res.status(201).json(createdItem);
    } catch (error) {
        console.error('Job item create error:', error);
        res.status(500).json({ error: 'Kalem eklenemedi' });
    }
});

// İş listesi durumunu güncelle
router.put('/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const jobList = await JobList.findByPk(id);

        if (!jobList) {
            return res.status(404).json({ error: 'İş listesi bulunamadı' });
        }

        await jobList.update({ status });
        res.json(jobList);
    } catch (error) {
        console.error('Job list status update error:', error);
        res.status(500).json({ error: 'Durum güncellenemedi' });
    }
});

// ⭐ KRİTİK: Job item'ı işaretle (check)
router.post('/items/:itemId/check', requireAuth, async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { itemId } = req.params;
        const userId = req.session.userId;

        // Item'ı bul
        const item = await JobItem.findByPk(itemId, {
            include: [
                { model: Product, as: 'product' },
                { model: Source, as: 'source' }
            ],
            transaction
        });

        if (!item) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Kalem bulunamadı' });
        }

        // Zaten işaretli mi kontrol et
        if (item.is_checked) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Bu kalem zaten işaretlenmiş' });
        }

        // İşaretle
        await item.update({
            is_checked: true,
            checked_by_user_id: userId,
            checked_at: new Date()
        }, { transaction });

        // STOK DÜŞÜMÜ: Eğer product_id doluysa VE source internal ise
        if (item.product_id && item.source.type === 'internal') {
            const product = await Product.findByPk(item.product_id, { transaction });

            if (product) {
                const newStock = product.current_stock - item.quantity;
                await product.update({
                    current_stock: Math.max(0, newStock) // Negatif olmasın
                }, { transaction });
            }
        }

        await transaction.commit();

        // Güncellenmiş item'ı getir
        const checkedItem = await JobItem.findByPk(itemId, {
            include: [
                {
                    model: User,
                    as: 'checkedBy',
                    attributes: ['id', 'full_name']
                }
            ]
        });

        res.json({
            success: true,
            message: 'İşlem başarılı',
            item: checkedItem
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Item check error:', error);
        res.status(500).json({ error: 'İşaretleme yapılamadı' });
    }
});

// Job item sil
router.delete('/items/:itemId', requireAuth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await JobItem.findByPk(itemId);

        if (!item) {
            return res.status(404).json({ error: 'Kalem bulunamadı' });
        }

        await item.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Job item delete error:', error);
        res.status(500).json({ error: 'Kalem silinemedi' });
    }
});

// İş listesi sil
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const jobList = await JobList.findByPk(id);

        if (!jobList) {
            return res.status(404).json({ error: 'İş listesi bulunamadı' });
        }

        // CASCADE olduğu için items da silinecek
        await jobList.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Job list delete error:', error);
        res.status(500).json({ error: 'İş listesi silinemedi' });
    }
});

module.exports = router;
