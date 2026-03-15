require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Railway'de çalışırken gerekli)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 1000 // IP başına 1000 istek (Geliştirme/Test aşaması için artırıldı)
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`🔍 Incoming Request: ${req.method} ${req.url} | IP: ${req.ip}`);
    next();
});

// Disable Caching (Debug Mode)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Health Check (No Auth)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', version: '2.4', timestamp: new Date() });
});

app.use(limiter);

// Session yapılandırması
// Session Configuration (Sequelize Store)
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('./config/database');
const { User, Employee } = require('./models');
const bcrypt = require('bcrypt');

const sessionStore = new SequelizeStore({
    db: sequelize,
    checkExpirationInterval: 15 * 60 * 1000, // 15 mins
    expiration: 24 * 60 * 60 * 1000  // 24 hours
});

// Create session table
sessionStore.sync();

app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-this',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Static dosyalar
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sources', require('./routes/sources'));
app.use('/api/products', require('./routes/products'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/admin', require('./routes/admin'));
// Phase 2 Routes
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/stock-movements', require('./routes/stock-movements'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/roles', require('./routes/roles')); // New Roles Route
app.use('/api/payment-accounts', require('./routes/payment-accounts'));
app.use('/api/units', require('./routes/units'));

// ... (rest of routes)

const { Role } = require('./models'); // Import Role for migration

// ... (existing code)

const syncRolesAndPermissions = async () => {
    try {
        console.log('🛡️ Rol ve Yetki sistemi senkronize ediliyor...');
        const { Role, PaymentAccount, User } = require('./models');
        const { Op } = require('sequelize');

        // 1. Define allowed roles
        const allowedRoles = ['Yönetici', 'Personel', 'Stok Sorumlusu'];

        // 1.1 Safely delete ANY role not in allowed list (avoid Foreign Key constraint)
        const rolesToDelete = await Role.findAll({
            where: { name: { [Op.notIn]: allowedRoles } }
        });

        if (rolesToDelete.length > 0) {
            const roleIdsToDelete = rolesToDelete.map(r => r.id);
            // Nullify user roles referencing these old roles first
            await User.update(
                { role_id: null },
                { where: { role_id: roleIdsToDelete } }
            );
            // Now safely delete
            await Role.destroy({
                where: { id: roleIdsToDelete }
            });
        }
        console.log('🧹 Yetkisiz roller temizlendi.');

        const allRoles = [
            // System Roles
            { name: 'Yönetici', permissions: ['all'], is_system: true },
            { name: 'Personel', permissions: ['view_jobs', 'view_products', 'view_attendance'], is_system: true },
            { name: 'Stok Sorumlusu', permissions: ['view_sources', 'view_products'], is_system: false }
        ];

        // 2. Create/Update Roles
        const roleMap = {};
        for (const r of allRoles) {
            // First ensure role exists
            let [role, created] = await Role.findOrCreate({
                where: { name: r.name },
                defaults: r
            });

            // FORCE UPDATE permissions to match strictly
            await Role.update(
                {
                    permissions: r.permissions,
                    is_system: r.is_system
                },
                { where: { id: role.id } }
            );

            // Reload to ensure we have latest data
            await role.reload();

            roleMap[r.name] = role;
            console.log(`✅ Rol güncellendi: ${role.name} -> [${role.permissions.join(', ')}]`);
        }

        // 3. Ensure Demo Payment Accounts
        const accounts = [
            { name: 'Merkez Kasa', type: 'cash', icon: '💵' },
            { name: 'Ziraat Bankası', type: 'bank', icon: '🏦' },
            { name: 'Şirket Kredi Kartı', type: 'credit_card', icon: '💳' }
        ];

        for (const a of accounts) {
            await PaymentAccount.findOrCreate({
                where: { name: a.name },
                defaults: a
            });
        }
        console.log('✅ Ödeme hesapları hazır.');

        // 4. Force Migrate Specific Users (Admin & Staff)
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        if (adminUser && roleMap['Yönetici']) {
            if (adminUser.role_id !== roleMap['Yönetici'].id) {
                await adminUser.update({ role_id: roleMap['Yönetici'].id });
                console.log('✅ Admin user role fixed.');
            }
        }

        const staffUser = await User.findOne({ where: { username: 'staff' } });
        if (staffUser && roleMap['Personel']) {
            if (staffUser.role_id !== roleMap['Personel'].id) {
                await staffUser.update({ role_id: roleMap['Personel'].id });
                console.log('✅ Staff user role fixed.');
            }
        }

        // 5. Migrate Any Other Legacy Users
        const legacyUsers = await User.findAll({ where: { role_id: null } });
        for (const user of legacyUsers) {
            if (user.role === 'admin' && roleMap['Yönetici']) {
                await user.update({ role_id: roleMap['Yönetici'].id });
            } else if (user.role === 'staff' && roleMap['Personel']) {
                await user.update({ role_id: roleMap['Personel'].id });
            }
        }

    } catch (error) {
        console.error('Role/Seed sync error:', error);
    }
};

const seedDemoData = async () => {
    // Deprecated: Logic moved to syncRolesAndPermissions for reliability
};

// Force Seed Endpoint (Nuclear Option)
app.get('/setup/force-seed', async (req, res) => {
    try {
        const performSeed = require('./seed');
        await performSeed();
        res.json({ message: 'Zorunlu test verileri başarıyla yüklendi!' });
    } catch (error) {
        console.error('Force seed hatası:', error);
        res.status(500).json({ error: 'Seed hatası', details: error.message });
    }
});



// ... inside initializeDatabase ...
// await syncRolesAndPermissions(); 


// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
});

// Sunucuyu başlat
const startServer = async () => {
    try {
        // 1. Önce veritabanı işlemlerini tamamla ki SQLite çakışması veya Validation error olmasın
        await initializeDatabase();

        // 2. Veritabanı hazır olduktan sonra sunucuyu dışarıya aç
        app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════╗');
            console.log('║   ŞİRKET PORTALI - V2.3 GÜNCELLENDİ    ║');
            console.log('╚════════════════════════════════════════╝');
            console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
            console.log('📂 Veritabanı: database/portal.db');
            console.log('Durdurmak için: Ctrl + C');
        });
    } catch (error) {
        console.error('❌ Kritik Hata: Sunucu başlatılamadı.', error);
        process.exit(1);
    }
};

const initializeDatabase = async () => {
    try {
        console.log('🔌 Veritabanı bağlantısı başlatılıyor...');

        // Veritabanı klasörünü kontrol et
        const dbDir = path.join(__dirname, '../database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const { sequelize } = require('./config/database');

        // Bağlantıyı test et
        await sequelize.authenticate();
        console.log('✓ Veritabanı bağlantısı başarılı.');

        // Tabloları oluştur (Sync)
        // force: false -> Tablo varsa silmez
        // alter: false -> Tablo yapısını değiştirmeye çalışmaz (Güvenli mod)
        // alter: true -> Tablo yapısını günceller (Schema update)
        await sequelize.query('PRAGMA foreign_keys = OFF');
        await sequelize.sync({ force: false, alter: false });
        await sequelize.query('PRAGMA foreign_keys = ON');
        console.log('✓ Tablolar senkronize edildi (Güvenli mod).');

        const { JobList } = require('./models');
        const existingJobsCount = await JobList.count().catch(() => 0);
        
        if (existingJobsCount === 0) {
            console.log('🔄 Veritabanı boş tespit edildi. Otomatik test senaryosu verileri yükleniyor...');
            try {
                const performSeed = require('./seed');
                await performSeed();
            } catch (seedError) {
                console.error('❌ Otomatik veri yükleme başarısız oldu:', seedError);
            }
        }

        // Otomatik Kullanıcı Oluşturma (Sync Missing Users)
        await syncRolesAndPermissions(); // Migrate Roles FIRST
        await seedDemoData(); // Seed Demo Data (Accounts, Extra Roles)
        await syncMissingUsers();

    } catch (error) {
        console.error('❌ Veritabanı başlatma hatası:', error.message);
        // Sunucu çalışmaya devam eder, ama DB istekleri hata verebilir.
    }
};

const syncMissingUsers = async () => {
    try {
        console.log('🔄 Kullanıcı senkronizasyonu kontrol ediliyor...');
        const employees = await Employee.findAll({ where: { is_active: true } });

        for (const emp of employees) {
            if (emp.user_id) {
                const existingUser = await User.findByPk(emp.user_id);
                if (existingUser) continue;
            }

            let baseUsername = emp.full_name.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.+$/g, '');

            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ where: { username } })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            const password = await bcrypt.hash('123456', 10);
            const user = await User.create({
                username, password, full_name: emp.full_name, role: 'staff', is_active: true
            });

            await emp.update({ user_id: user.id });
            console.log(`✨ Kullanıcı oluşturuldu: ${username} (${emp.full_name})`);
        }
    } catch (error) {
        console.error('Sync users error:', error);
    }
};

startServer();
