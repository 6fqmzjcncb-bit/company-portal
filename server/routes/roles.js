const express = require('express');
const router = express.Router();
const { Role, User } = require('../models');
const { requireAdmin, requireAuth } = require('../middleware/auth');

// Tüm rolleri listele
router.get('/', requireAuth, async (req, res) => {
    try {
        let roles = await Role.findAll();

        // --- DEMO FALLBACK ---
        if (roles.length === 0) {
            roles = [
                { id: 1, name: 'Yönetici', permissions: ['all'], is_system: true },
                { id: 2, name: 'Personel', permissions: ['view_tasks'], is_system: true },
                { id: 3, name: 'Muhasebe', permissions: ['view_dashboard', 'manage_salary', 'view_report'], is_system: false },
                { id: 4, name: 'Saha Ekibi', permissions: ['view_jobs', 'manage_stock'], is_system: false },
                { id: 5, name: 'Stok Sorumlusu', permissions: ['view_dashboard', 'manage_stock'], is_system: false }
            ];
            // Async: Try to save them for real in background
            (async () => {
                const { Role } = require('../models');
                for (const r of roles) await Role.findOrCreate({ where: { name: r.name }, defaults: r });
            })();
        }

        res.json(roles);
    } catch (error) {
        console.error('Role list error:', error);
        res.status(500).json({ error: 'Roller getirilemedi' });
    }
});

// Yeni rol oluştur
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Rol adı gereklidir' });
        }

        const existingRole = await Role.findOne({ where: { name } });
        if (existingRole) {
            return res.status(400).json({ error: 'Bu isimde bir rol zaten var' });
        }

        const role = await Role.create({
            name,
            permissions: permissions || [],
            is_system: false
        });

        res.status(201).json(role);
    } catch (error) {
        console.error('Role create error:', error);
        res.status(500).json({ error: 'Rol oluşturulamadı' });
    }
});

// Rol güncelle
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;

        const role = await Role.findByPk(id);
        if (!role) {
            return res.status(404).json({ error: 'Rol bulunamadı' });
        }

        if (name) {
            // Check name uniqueness if changed
            if (name !== role.name) {
                const exists = await Role.findOne({ where: { name } });
                if (exists) return res.status(400).json({ error: 'Bu isimde rol zaten var' });
                role.name = name;
            }
        }

        if (permissions) {
            role.permissions = permissions;
        }

        await role.save();
        res.json(role);
    } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({ error: 'Rol güncellenemedi' });
    }
});

// Rol sil
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findByPk(id);

        if (!role) {
            return res.status(404).json({ error: 'Rol bulunamadı' });
        }

        if (role.is_system) {
            return res.status(400).json({ error: 'Sistem rolleri silinemez' });
        }

        const userCount = await User.count({ where: { role_id: id } });
        if (userCount > 0) {
            return res.status(400).json({ error: 'Bu role bağlı kullanıcılar var, önce onları değiştirin' });
        }

        await role.destroy();
        res.json({ message: 'Rol silindi' });
    } catch (error) {
        console.error('Role delete error:', error);
        res.status(500).json({ error: 'Rol silinemedi' });
    }
});

module.exports = router;
