const { Sequelize } = require('sequelize');
const db = require('./models');

async function seed() {
    try {
        await db.sequelize.authenticate();
        console.log('Veritabanına bağlanıldı. Temizleniyor...');

        // Clear all tables
        await db.sequelize.sync({ force: true });
        console.log('Veritabanı temizlendi, oluşturuluyor...');

        // 1. Users
        const admin = await db.User.create({
            username: 'admin',
            password: '123', // Model hook will hash this
            full_name: 'Sistem Yöneticisi',
            role: 'admin'
        });

        const user1 = await db.User.create({
            username: 'ahmet',
            password: '123',
            full_name: 'Ahmet Yılmaz',
            role: 'user'
        });

        const user2 = await db.User.create({
            username: 'mehmet',
            password: '123',
            full_name: 'Mehmet Demir',
            role: 'user'
        });

        // 2. Units
        const unitAdet = await db.Unit.create({ name: 'Adet' });
        const unitMt = await db.Unit.create({ name: 'Metre' });
        const unitKg = await db.Unit.create({ name: 'Kg' });
        const unitKutu = await db.Unit.create({ name: 'Kutu' });

        // 3. Products
        const p1 = await db.Product.create({ name: 'Kombi 24kW', unit: 'Adet', category: 'Isıtma' });
        const p2 = await db.Product.create({ name: 'Boru 1/2"', unit: 'Metre', category: 'Tesisat' });
        const p3 = await db.Product.create({ name: 'Radyatör 60x120', unit: 'Adet', category: 'Isıtma' });
        const p4 = await db.Product.create({ name: 'Koli Bandı', unit: 'Adet', category: 'Sarf' });
        const p5 = await db.Product.create({ name: 'Lehim Seti', unit: 'Adet', category: 'Alet' });
        const p6 = await db.Product.create({ name: 'Kablo 3x2.5', unit: 'Metre', category: 'Elektrik' });
        const p7 = await db.Product.create({ name: 'Priz Tekli', unit: 'Adet', category: 'Elektrik' });

        // 4. Sources
        const s1 = await db.Source.create({ name: 'Merkez Depo', type: 'warehouse' });
        const s2 = await db.Source.create({ name: 'Koçtaş', type: 'supplier' });
        const s3 = await db.Source.create({ name: 'Yüksel Hırdavat', type: 'supplier' });
        const s4 = await db.Source.create({ name: 'Araç (34 ABC 123)', type: 'vehicle' });

        // 5. Employees
        const e1 = await db.Employee.create({
            first_name: 'Hüseyin',
            last_name: 'Çalışkan',
            position: 'Usta',
            phone: '05551234567',
            salary: 35000,
            hire_date: new Date('2023-01-15')
        });

        const e2 = await db.Employee.create({
            first_name: 'Kadir',
            last_name: 'Hızlı',
            position: 'Kalfa',
            phone: '05559876543',
            salary: 25000,
            hire_date: new Date('2024-03-01')
        });

        // 6. Payment Accounts
        const acc1 = await db.PaymentAccount.create({ name: 'Nakit Kasa', type: 'cash' });
        const acc2 = await db.PaymentAccount.create({ name: 'Garanti Bankası', type: 'bank' });

        // 7. Attendance
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        await db.Attendance.create({ employee_id: e1.id, date: yesterday, status: 'present', note: 'Tam gün şantiye' });
        await db.Attendance.create({ employee_id: e1.id, date: today, status: 'present', note: 'Beylikdüzü şantiye' });
        await db.Attendance.create({ employee_id: e2.id, date: yesterday, status: 'absent', note: 'Hasta' });
        await db.Attendance.create({ employee_id: e2.id, date: today, status: 'half_day', note: 'Öğleden sonra geldi' });

        // 8. Stock Movements
        await db.StockMovement.create({
            product_id: p1.id, source_id: s1.id, user_id: admin.id,
            type: 'in', quantity: 15, unit: 'Adet', note: 'Tedarikçi siparişi',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        });

        await db.StockMovement.create({
            product_id: p2.id, source_id: s1.id, user_id: admin.id,
            type: 'in', quantity: 500, unit: 'Metre', note: 'Toplu alım',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        });

        // 9. Jobs
        const j1 = await db.JobList.create({
            title: 'Beylikdüzü Şantiyesi - Kombi Tesisatı',
            created_by: admin.id,
            status: 'processing'
        });

        const j2 = await db.JobList.create({
            title: 'Kadıköy Ofis - Elektrik Tadilatı',
            created_by: user1.id,
            status: 'pending'
        });

        const j3 = await db.JobList.create({
            title: 'Maltepe Depo - Genel Sayım Alımları',
            created_by: admin.id,
            status: 'completed'
        });

        // Add views
        await db.JobView.create({ job_id: j1.id, user_id: admin.id });
        await db.JobView.create({ job_id: j1.id, user_id: user1.id });
        await db.JobView.create({ job_id: j2.id, user_id: user2.id });

        // 10. Job Items
        // Job 1 Items (Processing)
        await db.JobItem.create({
            job_id: j1.id, product_id: p1.id, source_id: s1.id, added_by: admin.id,
            quantity: 2, quantity_found: 2, is_checked: true, is_deleted: false, unit: 'Adet'
        });
        
        await db.JobItem.create({
            job_id: j1.id, product_id: p2.id, source_id: s1.id, added_by: admin.id,
            quantity: 50, quantity_found: 50, is_checked: true, is_deleted: false, unit: 'Metre'
        });

        await db.JobItem.create({
            job_id: j1.id, product_id: p3.id, source_id: s1.id, added_by: admin.id,
            quantity: 5, quantity_found: 3, is_checked: false, is_deleted: false, unit: 'Adet',
            note: '2 Adet daha lazım'
        });

        await db.JobItem.create({
            job_id: j1.id, product_id: p4.id, source_id: s2.id, added_by: user1.id,
            quantity: 3, quantity_found: 0, is_checked: false, is_deleted: false, unit: 'Adet'
        });

        // Job 1 Deleted Items
        await db.JobItemDeletion.create({
            job_id: j1.id,
            product_id: p5.id,
            product_name: 'Lehim Seti', // the manual snapshot
            source_name: 'Yüksel Hırdavat',
            quantity: 1,
            deleted_by: admin.id,
            reason: 'Yanlış yazıldı, şantiyede var'
        });
        
        await db.JobItemDeletion.create({
            job_id: j1.id,
            product_id: p3.id,
            product_name: 'Radyatör 60x120', // the manual snapshot
            source_name: 'Merkez Depo',
            quantity: 8,
            deleted_by: user1.id,
            reason: 'Müşteri vazgeçti'
        });

        // Job 2 Items (Pending)
        await db.JobItem.create({
            job_id: j2.id, product_id: p6.id, source_id: s2.id, added_by: user1.id,
            quantity: 100, quantity_found: 0, is_checked: false, is_deleted: false, unit: 'Metre'
        });
        
        await db.JobItem.create({
            job_id: j2.id, product_id: p7.id, source_id: s2.id, added_by: user1.id,
            quantity: 25, quantity_found: 0, is_checked: false, is_deleted: false, unit: 'Adet'
        });

        // Job 3 Items (Completed)
        await db.JobItem.create({
            job_id: j3.id, product_id: p4.id, source_id: s3.id, added_by: admin.id,
            quantity: 10, quantity_found: 10, is_checked: true, is_deleted: false, unit: 'Adet'
        });

        await db.JobItem.create({
            job_id: j3.id, product_id: p1.id, source_id: s1.id, added_by: admin.id,
            quantity: 1, quantity_found: 1, is_checked: true, is_deleted: false, unit: 'Adet'
        });

        // 11. Update job stats manually to reflect completion correctly
        if (typeof j1.updateStats === 'function') await j1.updateStats();
        if (typeof j2.updateStats === 'function') await j2.updateStats();
        if (typeof j3.updateStats === 'function') await j3.updateStats();

        console.log('✅ Örnek veriler başarıyla eklendi!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        process.exit(1);
    }
}

seed();
