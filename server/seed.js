const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const db = require('./models');

async function seed() {
    try {
        await db.sequelize.authenticate();
        console.log('Veritabanına bağlanıldı. Temizleniyor...');

        // Clear all tables
        await db.sequelize.sync({ force: true });
        console.log('Veritabanı temizlendi, oluşturuluyor...');

        // 1. Users
        const adminPwd = await bcrypt.hash('admin123', 10);
        const staffPwd = await bcrypt.hash('staff123', 10);
        
        const admin = await db.User.create({
            username: 'admin',
            password: adminPwd,
            full_name: 'Sistem Yöneticisi',
            role: 'admin'
        });

        const user1 = await db.User.create({
            username: 'staff',
            password: staffPwd,
            full_name: 'Örnek Personel',
            role: 'staff'
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
        const s1 = await db.Source.create({ name: 'Merkez Depo', type: 'warehouse', color_code: '#10b981' });
        const s2 = await db.Source.create({ name: 'Koçtaş', type: 'supplier', color_code: '#f59e0b' });
        const s3 = await db.Source.create({ name: 'Yüksel Hırdavat', type: 'supplier', color_code: '#ef4444' });
        const s4 = await db.Source.create({ name: 'Araç (34 ABC 123)', type: 'vehicle', color_code: '#3b82f6' });

        // 5. Employees
        const employees = [];
        const names = ['Hüseyin Çalışkan', 'Kadir Hızlı', 'Recep Demir', 'Mehmet Yılmaz', 'Ali Kaya', 'Veli Gürbüz', 'Kerem Can'];
        const positions = ['Usta', 'Kalfa', 'Çırak', 'Şoför', 'Usta', 'Kalfa', 'Mühendis'];
        const salaries = [35000, 25000, 18000, 22000, 36000, 24000, 45000];

        for(let i=0; i<names.length; i++) {
            employees.push(await db.Employee.create({
                full_name: names[i],
                position: positions[i],
                phone: `0555123456${i}`,
                salary: salaries[i],
                hire_date: new Date(`2023-0${1 + i}-15`)
            }));
        }

        // 6. Payment Accounts
        const acc1 = await db.PaymentAccount.create({ name: 'Nakit Kasa', type: 'cash' });
        const acc2 = await db.PaymentAccount.create({ name: 'Garanti Bankası', type: 'bank' });

        // 7. Attendance
        const today = new Date();
        for(let d=0; d<5; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() - d);
            for(let e of employees) {
                // Randomly assign presence
                const rand = Math.random();
                let status = 'present';
                if(rand > 0.8) status = 'absent';
                else if(rand > 0.7) status = 'half_day';

                await db.Attendance.create({ employee_id: e.id, date, status, note: status === 'present' ? 'Şantiye' : '' });
            }
        }

        // 8. Stock Movements
        await db.StockMovement.create({
            product_id: p1.id, source_id: s1.id, user_id: admin.id,
            movement_type: 'in', quantity: 15, unit: 'Adet', note: 'Tedarikçi siparişi',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        });

        await db.StockMovement.create({
            product_id: p2.id, source_id: s1.id, user_id: admin.id,
            movement_type: 'in', quantity: 500, unit: 'Metre', note: 'Toplu alım',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        });

        // 9. Jobs
        const j1 = await db.JobList.create({
            title: 'Beylikdüzü Şantiyesi - Kombi Tesisatı',
            created_by_user_id: admin.id,
            status: 'processing'
        });

        const j2 = await db.JobList.create({
            title: 'Kadıköy Ofis - Elektrik Tadilatı',
            created_by_user_id: user1.id,
            status: 'pending'
        });

        const j3 = await db.JobList.create({
            title: 'Maltepe Depo - Genel Sayım Alımları',
            created_by_user_id: admin.id,
            status: 'completed'
        });

        // Add views
        await db.JobView.create({ job_list_id: j1.id, user_id: admin.id });
        await db.JobView.create({ job_list_id: j1.id, user_id: user1.id });
        await db.JobView.create({ job_list_id: j2.id, user_id: admin.id });

        // 10. Job Items
        // Job 1 Items (Processing)
        await db.JobItem.create({
            job_list_id: j1.id, product_id: p1.id, source_id: s1.id, added_by: admin.id,
            quantity: 2, quantity_found: 2, is_checked: true, is_deleted: false, unit: 'Adet'
        });
        
        await db.JobItem.create({
            job_list_id: j1.id, product_id: p2.id, source_id: s1.id, added_by: admin.id,
            quantity: 50, quantity_found: 50, is_checked: true, is_deleted: false, unit: 'Metre'
        });

        await db.JobItem.create({
            job_list_id: j1.id, product_id: p3.id, source_id: s1.id, added_by: admin.id,
            quantity: 5, quantity_found: 3, is_checked: false, is_deleted: false, unit: 'Adet',
            note: '2 Adet daha lazım'
        });

        await db.JobItem.create({
            job_list_id: j1.id, product_id: p4.id, source_id: s2.id, added_by: user1.id,
            quantity: 3, quantity_found: 0, is_checked: false, is_deleted: false, unit: 'Adet'
        });

        // Job 1 Deleted Items
        await db.JobItemDeletion.create({
            job_list_id: j1.id,
            product_id: p5.id,
            product_name: 'Lehim Seti', // the manual snapshot
            source_name: 'Yüksel Hırdavat',
            quantity: 1,
            deleted_by_user_id: admin.id,
            reason: 'Yanlış yazıldı, şantiyede var'
        });
        
        await db.JobItemDeletion.create({
            job_list_id: j1.id,
            product_id: p3.id,
            product_name: 'Radyatör 60x120', // the manual snapshot
            source_name: 'Merkez Depo',
            quantity: 8,
            deleted_by_user_id: user1.id,
            reason: 'Müşteri vazgeçti'
        });

        // Job 2 Items (Pending)
        await db.JobItem.create({
            job_list_id: j2.id, product_id: p6.id, source_id: s2.id, added_by: user1.id,
            quantity: 100, quantity_found: 0, is_checked: false, is_deleted: false, unit: 'Metre'
        });
        
        await db.JobItem.create({
            job_list_id: j2.id, product_id: p7.id, source_id: s2.id, added_by: user1.id,
            quantity: 25, quantity_found: 0, is_checked: false, is_deleted: false, unit: 'Adet'
        });

        // Job 3 Items (Completed)
        await db.JobItem.create({
            job_list_id: j3.id, product_id: p4.id, source_id: s3.id, added_by: admin.id,
            quantity: 10, quantity_found: 10, is_checked: true, is_deleted: false, unit: 'Adet'
        });

        await db.JobItem.create({
            job_list_id: j3.id, product_id: p1.id, source_id: s1.id, added_by: admin.id,
            quantity: 1, quantity_found: 1, is_checked: true, is_deleted: false, unit: 'Adet'
        });

        // 11. Update job stats manually to reflect completion correctly
        if (typeof j1.updateStats === 'function') await j1.updateStats();
        if (typeof j2.updateStats === 'function') await j2.updateStats();
        if (typeof j3.updateStats === 'function') await j3.updateStats();

        // 12. Extra Jobs & Movements (Bulk Data)
        const products = [p1, p2, p3, p4, p5, p6, p7];
        const sources = [s1, s2, s3, s4];
        
        for(let i=0; i<30; i++) {
             // 30 extra stock movements
             await db.StockMovement.create({
                product_id: products[Math.floor(Math.random() * products.length)].id, 
                source_id: sources[Math.floor(Math.random() * sources.length)].id, 
                user_id: admin.id,
                movement_type: Math.random() > 0.5 ? 'in' : 'out', 
                quantity: Math.floor(Math.random() * 50) + 1, 
                unit: 'Adet', 
                note: 'Otomatik Üretilen Hareket ' + i,
                date: new Date(Date.now() - (Math.random() * 10) * 24 * 60 * 60 * 1000)
            });
        }
        
        for(let i=1; i<=8; i++) {
             const jExtra = await db.JobList.create({
                title: `Ekstra Şantiye Projesi #${i}`,
                created_by_user_id: user1.id,
                status: i % 3 === 0 ? 'completed' : (i % 2 === 0 ? 'pending' : 'processing')
            });
            await db.JobView.create({ job_list_id: jExtra.id, user_id: admin.id });
            await db.JobView.create({ job_list_id: jExtra.id, user_id: user1.id });
            
            // Add 3-8 items to each
            const numItems = Math.floor(Math.random() * 5) + 3;
            for(let k=0; k<numItems; k++) {
                const qty = Math.floor(Math.random() * 20) + 1;
                await db.JobItem.create({
                    job_list_id: jExtra.id, product_id: products[k].id, source_id: s1.id, added_by: admin.id,
                    quantity: qty, quantity_found: jExtra.status === 'completed' ? qty : Math.floor(Math.random() * qty), 
                    is_checked: true, is_deleted: false, unit: 'Adet'
                });
            }
            if (typeof jExtra.updateStats === 'function') await jExtra.updateStats();
        }

        console.log('✅ Örnek veriler başarıyla eklendi!');
        return true;
    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        throw error;
    }
}

module.exports = seed;
