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
                },
                {
                    model: JobItem,
                    as: 'items',
                    attributes: ['id', 'is_checked']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Her job için completion % ve viewers hesapla
        const JobView = require('../models/JobView');
        const jobsWithStats = await Promise.all(jobLists.map(async (job) => {
            const jobData = job.toJSON();

            // Completion %
            const totalItems = jobData.items.length;
            const completedItems = jobData.items.filter(i => i.is_checked).length;
            jobData.completion_percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            // Viewers (son 3)
            const viewers = await JobView.findAll({
                where: { job_list_id: job.id },
                include: [{ model: User, as: 'viewer', attributes: ['id', 'full_name'] }],
                order: [['viewed_at', 'DESC']],
                limit: 3
            });
            jobData.recent_viewers = viewers.map(v => v.viewer);

            // items array'ini kaldır (gereksiz)
            delete jobData.items;

            return jobData;
        }));

        res.json(jobsWithStats);
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

        // Completion % hesapla
        const totalItems = jobList.items.length;
        const completedItems = jobList.items.filter(item => item.is_checked).length;
        const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Viewers (kim baktı) getir
        const JobView = require('../models/JobView');
        const viewers = await JobView.findAll({
            where: { job_list_id: id },
            include: [{
                model: User,
                as: 'viewer',
                attributes: ['id', 'full_name']
            }],
            order: [['viewed_at', 'DESC']],
            limit: 10 // Son 10 görüntüleme
        });

        // Deletions (silinen ürünler) getir
        const JobItemDeletion = require('../models/JobItemDeletion');
        const deletions = await JobItemDeletion.findAll({
            where: { job_list_id: id },
            include: [{
                model: User,
                as: 'deletedBy',
                attributes: ['id', 'full_name']
            }],
            order: [['deleted_at', 'DESC']]
        });

        res.json({
            ...jobList.toJSON(),
            completion: {
                total: totalItems,
                completed: completedItems,
                percentage: completionPercentage
            },
            viewers: viewers.map(v => ({
                user: v.viewer,
                viewed_at: v.viewed_at
            })),
            deletions: deletions.map(d => ({
                product_name: d.product_name,
                quantity: d.quantity,
                source_name: d.source_name,
                deleted_by: d.deletedBy,
                deleted_at: d.deleted_at,
                reason: d.reason
            }))
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
        let isAlreadyChecked = false;

        if (item.is_checked) {
            // Eğer tamamen tamamlanmışsa işlem yapma
            if (!item.quantity_found || item.quantity_found >= item.quantity) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Bu kalem zaten tamamen işaretlenmiş' });
            }
            // Kısmi tamamlanmışsa (eksik varsa) devam et -> Tamamla
            isAlreadyChecked = true;
        }

        // Güncelleme verilerini hazırla
        const updateData = {
            is_checked: true,
            checked_by_user_id: userId,
            checked_at: new Date(),
            // Eğer zaten checked ise (kısmi -> tam), o zaman hepsini aldık
            // Değilse, mevcut girilen (found) değeri kullan veya hepsini aldık say
            quantity_found: isAlreadyChecked ? item.quantity : (item.quantity_found || item.quantity)
        };

        // Eğer tam tamamlandıysa eksik bilgilerini temizle
        if (updateData.quantity_found >= item.quantity) {
            updateData.quantity_missing = 0;
            updateData.missing_source = null;
            updateData.missing_reason = null;
        } else {
            // Kısmi tamamlandı ise eksik miktarını güncelle
            // missing_source ve reason alanlarına dokunma (varsa korunsun)
            updateData.quantity_missing = item.quantity - updateData.quantity_found;
        }

        await item.update(updateData, { transaction });

        // STOK DÜŞÜMÜ: Sadece İLK KEZ işaretleniyorsa stoktan düş
        // (Not: Kısmi stok düşümü yapmıyoruz, check edildiği an tüm stok düşülüyor varsayımı korundu)
        if (!isAlreadyChecked && item.product_id && item.source.type === 'internal') {
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

// Job item'ı düzenle (miktar ve kaynak)
router.put('/items/:itemId', requireAuth, async (req, res) => {
    try {
        const { itemId } = req.params;
        let { source_id, source_name, quantity } = req.body;

        const item = await JobItem.findByPk(itemId);

        if (!item) {
            return res.status(404).json({ error: 'Kalem bulunamadı' });
        }

        // İşaretlenmişse düzenlenemez
        if (item.is_checked) {
            return res.status(400).json({ error: 'İşaretlenmiş kalemler düzenlenemez' });
        }

        // Eğer source_name varsa, otomatik kaynak oluştur/bul
        if (source_name) {
            source_name = source_name.trim();

            // Var mı kontrol et
            let source = await Source.findOne({ where: { name: source_name } });

            // Yoksa oluştur
            if (!source) {
                source = await Source.create({
                    name: source_name,
                    type: 'external', // Free text kaynaklar external
                    is_active: true
                });
            }

            source_id = source.id;
        }

        // Update
        const updateData = {};
        if (quantity) updateData.quantity = quantity;
        if (source_id) updateData.source_id = source_id;

        // Partial completion fields
        if (req.body.quantity_found !== undefined) updateData.quantity_found = req.body.quantity_found;
        if (req.body.quantity_missing !== undefined) updateData.quantity_missing = req.body.quantity_missing;
        if (req.body.missing_source !== undefined) updateData.missing_source = req.body.missing_source;
        if (req.body.missing_reason !== undefined) updateData.missing_reason = req.body.missing_reason;

        await item.update(updateData);

        // Güncellenmiş item'ı ilişkileriyle getir
        const updatedItem = await JobItem.findByPk(itemId, {
            include: [
                { model: Product, as: 'product' },
                { model: Source, as: 'source' }
            ]
        });

        res.json({ success: true, item: updatedItem });
    } catch (error) {
        console.error('Job item update error:', error);
        res.status(500).json({ error: 'Kalem güncellenemedi' });
    }
});

// Item'ı böl (Hem incomplete hem partial destekler)
router.post('/items/:itemId/split', requireAuth, async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { itemId } = req.params;
        const { split_quantity } = req.body;
        const item = await JobItem.findByPk(itemId, { transaction });

        if (!item) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Kalem bulunamadı' });
        }

        // SENARYO 1: Henüz alınmamış (Incomplete) item'ı bölme
        if (!item.is_checked) {
            const qtyToSplit = parseInt(split_quantity);

            if (!qtyToSplit || isNaN(qtyToSplit) || qtyToSplit >= item.quantity || qtyToSplit <= 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Geçersiz ayırma miktarı. Toplam miktardan az olmalı.' });
            }

            // 1. Mevcut item miktarını azalt
            await item.update({ quantity: item.quantity - qtyToSplit }, { transaction });

            // 2. Yeni item oluştur (aynı özelliklerle)
            await JobItem.create({
                job_list_id: item.job_list_id,
                product_id: item.product_id,
                custom_name: item.custom_name,
                source_id: item.source_id,
                quantity: qtyToSplit,
                is_checked: false,
                quantity_found: null,
                quantity_missing: null,
                missing_source: null,
                missing_reason: null
            }, { transaction });

            await transaction.commit();
            return res.json({ success: true, message: 'Kalem başarıyla bölündü' });
        }

        // SENARYO 2: Kısmi tamamlanmış (Partial) item'ı bölme (Eski Logic)
        if (!item.quantity_found || item.quantity_found >= item.quantity) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Tamamlanmış itemlar bölünemez.' });
        }

        const missing = item.quantity - item.quantity_found;

        // 1. Mevcut item'ı TAM ALINDI yap
        await item.update({
            quantity: item.quantity_found,
            quantity_found: item.quantity_found,
            quantity_missing: 0,
            missing_source: null,
            missing_reason: null
        }, { transaction });

        // 2. Eksik kısım için YENİ item oluştur
        await JobItem.create({
            job_list_id: item.job_list_id,
            product_id: item.product_id,
            custom_name: item.custom_name,
            source_id: item.source_id, // Ana kaynağı koru
            quantity: missing,
            is_checked: false, // Yeni item incomplete başlar
            quantity_found: null,
            quantity_missing: null,
            missing_source: null,
            missing_reason: null
        }, { transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Kısmi item başarıyla ayrıldı' });

    } catch (error) {
        await transaction.rollback();
        console.error('Item split error:', error);
        res.status(500).json({ error: 'İşlem sırasında hata oluştu' });
    }
});

// Job item işaretini kaldır (uncheck)
router.post('/items/:itemId/uncheck', requireAuth, async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { itemId } = req.params;

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

        if (!item.is_checked) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Bu kalem zaten işaretli değil' });
        }

        // İşareti kaldır
        await item.update({
            is_checked: false,
            checked_by_user_id: null,
            checked_at: null
        }, { transaction });

        // STOK GERİ EKLE: Eğer product_id doluysa VE source internal ise
        if (item.product_id && item.source.type === 'internal') {
            const product = await Product.findByPk(item.product_id, { transaction });

            if (product) {
                const newStock = product.current_stock + item.quantity;
                await product.update({
                    current_stock: newStock
                }, { transaction });
            }
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'İşaret kaldırıldı',
            item
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Item uncheck error:', error);
        res.status(500).json({ error: 'İşaret kaldırılamadı' });
    }
});

// Job item sil (soft delete + log)
router.delete('/items/:itemId', requireAuth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { reason } = req.body; // Opsiyonel silme sebebi
        const userId = req.session.userId;

        const item = await JobItem.findByPk(itemId, {
            include: [
                { model: Product, as: 'product' },
                { model: Source, as: 'source' }
            ]
        });

        if (!item) {
            return res.status(404).json({ error: 'Kalem bulunamadı' });
        }

        // Silme log'u oluştur (models içine import et)
        const JobItemDeletion = require('../models/JobItemDeletion');

        await JobItemDeletion.create({
            job_list_id: item.job_list_id,
            product_name: item.product ? item.product.name : item.custom_name,
            quantity: item.quantity,
            source_name: item.source ? item.source.name : null,
            deleted_by_user_id: userId,
            deleted_at: new Date(),
            reason: reason || null
        });

        // Hard delete (log zaten kaydedildi)
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

// View tracking: İş listesini görüntüle (log kaydı)
router.post('/:id/view', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;

        const JobView = require('../models/JobView');

        // Zaten görüntülemiş mi kontrol et (son 1 saatte)
        const recentView = await JobView.findOne({
            where: {
                job_list_id: id,
                user_id: userId
            },
            order: [['viewed_at', 'DESC']]
        });

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Son 1 saat içinde görüntülememişse yeni kayıt oluştur
        if (!recentView || recentView.viewed_at < oneHourAgo) {
            await JobView.create({
                job_list_id: id,
                user_id: userId,
                viewed_at: new Date()
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('View tracking error:', error);
        res.status(500).json({ error: 'Görüntüleme kaydedilemedi' });
    }
});
