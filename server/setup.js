const bcrypt = require('bcrypt');
const { sequelize } = require('./config/database');
const { User, Source, Product, JobList, JobItem, Employee, Attendance, StockMovement } = require('./models');

async function setup() {
    try {
        console.log('🔧 Veritabanı kurulumu başlatılıyor...\n');

        // Tabloları oluştur
        await sequelize.sync({ force: true });
        console.log('✓ Tablolar oluşturuldu\n');

        // Admin kullanıcısı
        const adminPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            username: 'admin',
            password: adminPassword,
            full_name: 'Sistem Yöneticisi',
            role: 'admin'
        });

        // Personel kullanıcısı
        const staffPassword = await bcrypt.hash('staff123', 10);
        await User.create({
            username: 'staff',
            password: staffPassword,
            full_name: 'Çalışan Personel',
            role: 'staff'
        });

        console.log('✓ Kullanıcılar oluşturuldu');

        // Örnek kaynaklar
        await Source.bulkCreate([
            {
                name: 'Merkez Depo',
                color_code: '#d4edda',
                type: 'internal'
            },
            {
                name: 'Koçtaş',
                color_code: '#fff3cd',
                type: 'external'
            },
            {
                name: 'Yüksel Hırdavat',
                color_code: '#cfe2ff',
                type: 'external'
            },
            {
                name: 'Yan Depo',
                color_code: '#e2e3e5',
                type: 'internal'
            }
        ]);

        console.log('✓ Kaynaklar oluşturuldu');

        // Örnek ürünler
        await Product.bulkCreate([
            {
                name: 'Kombi 24kW',
                barcode: 'KMB24001',
                current_stock: 15
            },
            {
                name: 'Radyatör 60x120',
                barcode: 'RAD60120',
                current_stock: 45
            },
            {
                name: 'Boru 1/2" (metre)',
                barcode: 'BRU12001',
                current_stock: 250
            },
            {
                name: 'Dirsek 1/2"',
                barcode: 'DRS12001',
                current_stock: 120
            },
            {
                name: 'Te 1/2"',
                barcode: 'TE12001',
                current_stock: 80
            },
            {
                name: 'Vana 1/2"',
                barcode: 'VAN12001',
                current_stock: 60
            },
            {
                name: 'Hilti Matkap',
                barcode: 'HLT001',
                current_stock: 3
            },
            {
                name: 'Ölçü Aleti',
                barcode: 'OLC001',
                current_stock: 5
            }
        ]);

        console.log('✓ Ürünler oluşturuldu');

        // Örnek iş listesi
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        const jobList = await JobList.create({
            title: 'Beylikdüzü Şantiyesi - Kombi Tesisatı',
            status: 'pending',
            created_by_user_id: adminUser.id
        });

        // Örnek kalemler
        const merkezDepo = await Source.findOne({ where: { name: 'Merkez Depo' } });
        const koctas = await Source.findOne({ where: { name: 'Koçtaş' } });
        const yuksel = await Source.findOne({ where: { name: 'Yüksel Hırdavat' } });

        const kombi = await Product.findOne({ where: { name: 'Kombi 24kW' } });
        const radyator = await Product.findOne({ where: { name: 'Radyatör 60x120' } });
        const boru = await Product.findOne({ where: { name: 'Boru 1/2" (metre)' } });

        await JobItem.bulkCreate([
            {
                job_list_id: jobList.id,
                product_id: kombi.id,
                source_id: merkezDepo.id,
                quantity: 2
            },
            {
                job_list_id: jobList.id,
                product_id: radyator.id,
                source_id: merkezDepo.id,
                quantity: 8
            },
            {
                job_list_id: jobList.id,
                product_id: boru.id,
                source_id: merkezDepo.id,
                quantity: 50
            },
            {
                job_list_id: jobList.id,
                custom_name: '1 Kutu Vida 4x40',
                source_id: koctas.id,
                quantity: 1
            },
            {
                job_list_id: jobList.id,
                custom_name: 'Koli Bandı',
                source_id: koctas.id,
                quantity: 2
            },
            {
                job_list_id: jobList.id,
                custom_name: 'Lehim Seti',
                source_id: yuksel.id,
                quantity: 1
            }
        ]);

        console.log('✓ Örnek iş listesi ve kalemler oluşturuldu');

        // Fase 2: Örnek personel
        const employees = await Employee.bulkCreate([
            {
                full_name: 'Mehmet Yılmaz',
                phone: '0532 123 4567',
                role: 'worker',
                daily_wage: 850.00,
                hire_date: '2025-01-15',
                is_active: true
            },
            {
                full_name: 'Ahmet Demir',
                phone: '0533 234 5678',
                role: 'worker',
                daily_wage: 800.00,
                hire_date: '2025-02-01',
                is_active: true
            },
            {
                full_name: 'Ali Kaya',
                phone: '0534 345 6789',
                role: 'supervisor',
                daily_wage: 1200.00,
                hire_date: '2024-12-01',
                is_active: true
            }
        ]);

        console.log('✓ Örnek personel oluşturuldu');

        // Örnek çalışma kayıtları (son 5 gün)
        const today = new Date();
        const attendanceRecords = [];

        for (let i = 4; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            employees.forEach((employee, index) => {
                attendanceRecords.push({
                    employee_id: employee.id,
                    date: dateStr,
                    worked: i !== 0 || index !== 1, // Ahmet bugün çalışmadı
                    hours_worked: i !== 0 || index !== 1 ? 8 + (Math.random() * 2) : 0,
                    location: i % 2 === 0 ? 'Beylikdüzü Şantiye' : 'Esenyurt Proje',
                    created_by: adminUser.id
                });
            });
        }

        await Attendance.bulkCreate(attendanceRecords);

        console.log('✓ Örnek çalışma kayıtları oluşturuldu\n');

        console.log('╔════════════════════════════════════════╗');
        console.log('║      KURULUM BAŞARIYLA TAMAMLANDI      ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('');
        console.log('Şimdi sunucuyu başlatabilirsiniz:');
        console.log('  npm start');
        console.log('');
        console.log('Giriş Bilgileri:');
        console.log('  Admin  -> admin / admin123');
        console.log('  Personel -> staff / staff123');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Kurulum hatası:', error);
        process.exit(1);
    }
}

setup();
