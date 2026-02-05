require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Session yapılandırması
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 saat
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
        console.log('🚀 Sunucu başlatılıyor... (Adım 1)');

        // Veritabanı klasörünü kontrol et
        const dbDir = path.join(__dirname, '../database');
        console.log(`📁 Hedef veritabanı klasörü: ${dbDir}`);

        try {
            if (!fs.existsSync(dbDir)) {
                console.log('📁 Klasör yok, oluşturuluyor...');
                fs.mkdirSync(dbDir, { recursive: true });
                console.log('✓ Klasör oluşturuldu.');
            } else {
                console.log('✓ Klasör zaten mevcut.');
            }
        } catch (fsError) {
            console.error('⚠️ Dosya sistemi hatası (ihmal edilebilir):', fsError.message);
        }

        console.log('🔌 Veritabanı bağlantısı test ediliyor... (Adım 2)');
        await testConnection();
        console.log('✓ Bağlantı testi tamamlandı.');

        // Auto-sync schema changes (non-destructive)
        try {
            console.log('↻ Sequelize modelleri yükleniyor...');
            const { sequelize } = require('./config/database');
            console.log('↻ Şema senkronizasyonu başlıyor (alter: true)...');

            // Veritabanı senkronizasyonu
            // "alter: true" bazen SQLite'da FK hatalarına sebep olabilir (orphaned data varsa).
            // Şimdilik kapatıyoruz ki sunucu açılsın. Şema zaten büyük oranda uyumlu.
            await sequelize.sync({ alter: true });
            console.log('✓ Veritabanı senkronize edildi (alter: true)');
        } catch (syncError) {
            console.error('⚠️ Schema sync error (non-fatal):', syncError.message);
            console.error(syncError);
        }

        console.log('⚡ Uygulama dinlemeye başlıyor... (Adım 3)');
        app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════╗');
            console.log('║   ŞİRKET PORTALI - V2.2 GÜNCELLENDİ    ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('');
            console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
            console.log('📂 Veritabanı: database/portal.db');
            console.log('');
            console.log('Varsayılan Giriş Bilgileri:');
            console.log('  Admin  -> Kullanıcı: admin  | Şifre: admin123');
            console.log('  Personel -> Kullanıcı: staff  | Şifre: staff123');
            console.log('');
            console.log('Durdurmak için: Ctrl + C');
            console.log('');
        });
    } catch (error) {
        console.error('Sunucu başlatılamadı:', error);
        process.exit(1);
    }
};

startServer();
