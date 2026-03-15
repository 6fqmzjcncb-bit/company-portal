const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const db = require('./models');

async function seed() {
    try {
        await db.sequelize.authenticate();
        console.log('Veritabanına bağlanıldı. Temizleniyor...');

        await db.sequelize.sync({ force: true });
        console.log('Veritabanı temizlendi, oluşturuluyor...');

        // ─────────────────────────────────────────
        // 1. KULLANICILAR
        // ─────────────────────────────────────────
        const adminPwd = await bcrypt.hash('admin123', 10);
        const staffPwd = await bcrypt.hash('staff123', 10);

        const admin = await db.User.create({ username: 'admin',  password: adminPwd, full_name: 'Sistem Yöneticisi', role: 'admin' });
        const user1 = await db.User.create({ username: 'staff',  password: staffPwd, full_name: 'Örnek Personel',     role: 'staff' });

        // ─────────────────────────────────────────
        // 2. BİRİMLER
        // ─────────────────────────────────────────
        await db.Unit.create({ name: 'Adet' });
        await db.Unit.create({ name: 'Metre' });
        await db.Unit.create({ name: 'Kg' });
        await db.Unit.create({ name: 'Kutu' });
        await db.Unit.create({ name: 'Litre' });
        await db.Unit.create({ name: 'Paket' });

        // ─────────────────────────────────────────
        // 3. ÜRÜNLER (barkod + marka + stok dahil)
        // ─────────────────────────────────────────
        const productData = [
            // Isıtma
            { name: 'Kombi 24kW', barcode: 'KMB240001', brand: 'Baymak',    unit: 'Adet',  current_stock: 8,   category: 'Isıtma' },
            { name: 'Kombi 28kW', barcode: 'KMB280002', brand: 'Vaillant',  unit: 'Adet',  current_stock: 5,   category: 'Isıtma' },
            { name: 'Kombi 32kW', barcode: 'KMB320003', brand: 'Buderus',   unit: 'Adet',  current_stock: 3,   category: 'Isıtma' },
            { name: 'Radyatör 60x60',    barcode: 'RDY600004', brand: 'Demirdöküm', unit: 'Adet',  current_stock: 22,  category: 'Isıtma' },
            { name: 'Radyatör 60x80',    barcode: 'RDY800005', brand: 'Demirdöküm', unit: 'Adet',  current_stock: 18,  category: 'Isıtma' },
            { name: 'Radyatör 60x100',   barcode: 'RDY100006', brand: 'Bosch',      unit: 'Adet',  current_stock: 14,  category: 'Isıtma' },
            { name: 'Radyatör 60x120',   barcode: 'RDY120007', brand: 'Bosch',      unit: 'Adet',  current_stock: 10,  category: 'Isıtma' },
            { name: 'Havlupan 40x60',    barcode: 'HVP400008', brand: 'Delphi',     unit: 'Adet',  current_stock: 12,  category: 'Isıtma' },
            { name: 'Havlupan 50x80',    barcode: 'HVP500009', brand: 'Delphi',     unit: 'Adet',  current_stock: 9,   category: 'Isıtma' },
            // Tesisat
            { name: 'Çelik Boru 1/2"',  barcode: 'BRU120010', brand: 'Mannesmann', unit: 'Metre', current_stock: 450, category: 'Tesisat' },
            { name: 'Çelik Boru 3/4"',  barcode: 'BRU340011', brand: 'Mannesmann', unit: 'Metre', current_stock: 300, category: 'Tesisat' },
            { name: 'PPRC Boru 20mm',    barcode: 'PPRC200012', brand: 'Wavin',     unit: 'Metre', current_stock: 250, category: 'Tesisat' },
            { name: 'PPRC Boru 25mm',    barcode: 'PPRC250013', brand: 'Wavin',     unit: 'Metre', current_stock: 180, category: 'Tesisat' },
            { name: 'Musluk (Krom)',      barcode: 'MSL010014', brand: 'Grohe',      unit: 'Adet',  current_stock: 35,  category: 'Tesisat' },
            { name: 'Vana 1/2" Küresel', barcode: 'VNA120015', brand: 'Oventrop',   unit: 'Adet',  current_stock: 60,  category: 'Tesisat' },
            { name: 'Vana 3/4" Küresel', barcode: 'VNA340016', brand: 'Oventrop',   unit: 'Adet',  current_stock: 45,  category: 'Tesisat' },
            { name: 'Gaz Sayacı G4',     barcode: 'GSY040017', brand: 'Elster',     unit: 'Adet',  current_stock: 7,   category: 'Tesisat' },
            { name: 'Su Sayacı 1/2"',    barcode: 'SSY020018', brand: 'Zenner',     unit: 'Adet',  current_stock: 20,  category: 'Tesisat' },
            // Elektrik
            { name: 'Kablo NYM 3x2.5',   barcode: 'KBL250019', brand: 'Prysmian',  unit: 'Metre', current_stock: 800, category: 'Elektrik' },
            { name: 'Kablo NYM 3x1.5',   barcode: 'KBL150020', brand: 'Prysmian',  unit: 'Metre', current_stock: 600, category: 'Elektrik' },
            { name: 'Kablo NYM 2x0.75',  barcode: 'KBL070021', brand: 'Prysmian',  unit: 'Metre', current_stock: 400, category: 'Elektrik' },
            { name: 'Priz Tekli Sıvaaltı',barcode: 'PRZ010022', brand: 'ABB',       unit: 'Adet',  current_stock: 120, category: 'Elektrik' },
            { name: 'Anahtar Tekli',      barcode: 'ANH010023', brand: 'ABB',       unit: 'Adet',  current_stock: 95,  category: 'Elektrik' },
            { name: 'Sigorta 10A Oto',    barcode: 'SGT100024', brand: 'Schneider', unit: 'Adet',  current_stock: 50,  category: 'Elektrik' },
            { name: 'Sigorta 16A Oto',    barcode: 'SGT160025', brand: 'Schneider', unit: 'Adet',  current_stock: 40,  category: 'Elektrik' },
            { name: 'Dağıtım Panosu 8\'li', barcode: 'PNO080026', brand: 'Schneider', unit: 'Adet', current_stock: 15, category: 'Elektrik' },
            // Aydınlatma
            { name: 'LED Panel 60x60 40W', barcode: 'LED400027', brand: 'Philips',  unit: 'Adet',  current_stock: 30,  category: 'Aydınlatma' },
            { name: 'LED Ampul 9W E27',    barcode: 'LED090028', brand: 'Osram',    unit: 'Adet',  current_stock: 200, category: 'Aydınlatma' },
            { name: 'LED Spot 5W GU10',    barcode: 'LED050029', brand: 'Osram',    unit: 'Adet',  current_stock: 80,  category: 'Aydınlatma' },
            { name: 'Floresan 36W',        barcode: 'FLR360030', brand: 'Philips',  unit: 'Adet',  current_stock: 50,  category: 'Aydınlatma' },
            // İklimlendirme
            { name: 'Klima 9000 BTU',      barcode: 'KLM090031', brand: 'Daikin',   unit: 'Adet',  current_stock: 6,   category: 'İklimlendirme' },
            { name: 'Klima 12000 BTU',     barcode: 'KLM120032', brand: 'Daikin',   unit: 'Adet',  current_stock: 4,   category: 'İklimlendirme' },
            { name: 'Klima Bakır Boru 1/4',barcode: 'KBB140033', brand: 'Genco',    unit: 'Metre', current_stock: 150, category: 'İklimlendirme' },
            { name: 'Klima Gazı R410A',     barcode: 'KGZ410034', brand: 'Chemours', unit: 'Kg',    current_stock: 20,  category: 'İklimlendirme' },
            { name: 'Klima Gazı R32',       barcode: 'KGZ320035', brand: 'Chemours', unit: 'Kg',    current_stock: 15,  category: 'İklimlendirme' },
            // Sarf - Alet
            { name: 'Teflon Bant (10 rulo)', barcode: 'TFL010036', brand: 'Hilti',  unit: 'Kutu',  current_stock: 25,  category: 'Sarf' },
            { name: 'Lastik Conta 1/2"',     barcode: 'CNT120037', brand: 'Generic', unit: 'Kutu',  current_stock: 30,  category: 'Sarf' },
            { name: 'Silikon (Şeffaf)',       barcode: 'SLK010038', brand: 'Bostik', unit: 'Adet',  current_stock: 40,  category: 'Sarf' },
            { name: 'Keten + Gazyağı',        barcode: 'KTN010039', brand: 'Generic', unit: 'Kutu', current_stock: 15,  category: 'Sarf' },
            { name: 'Dübel 8x60mm',           barcode: 'DBL080040', brand: 'Rawlplug', unit: 'Kutu', current_stock: 20, category: 'Nalburiye' },
            { name: 'Vida 4x40mm YHB',        barcode: 'VDA440041', brand: 'Hilti',  unit: 'Kutu',  current_stock: 18,  category: 'Nalburiye' },
            { name: 'Lehim Seti (Küçük)',      barcode: 'LHM010042', brand: 'Harris', unit: 'Adet',  current_stock: 10,  category: 'Alet' },
            { name: 'Silikon Tabancası',        barcode: 'STB010043', brand: 'Bosch',  unit: 'Adet',  current_stock: 8,   category: 'Alet' },
            { name: 'Matkap Ucu Seti (19 Parça)', barcode: 'MTK190044', brand: 'Bosch', unit: 'Kutu', current_stock: 12, category: 'Alet' },
            { name: 'Koli Bandı (48mm)',        barcode: 'KLB480045', brand: 'Tesa',   unit: 'Adet',  current_stock: 60,  category: 'Sarf' },
            // Kontrol
            { name: 'Akıllı Termostat WiFi',   barcode: 'TRM010046', brand: 'Honeywell', unit: 'Adet', current_stock: 5, category: 'Kontrol' },
            { name: 'Oda Termostatı Manuel',   barcode: 'TRM020047', brand: 'Siemens',   unit: 'Adet', current_stock: 18, category: 'Kontrol' },
            { name: 'Zaman Saati Digital',     barcode: 'ZMN010048', brand: 'Siemens',   unit: 'Adet', current_stock: 12, category: 'Kontrol' },
        ];

        const insertedProducts = [];
        for (const pd of productData) {
            insertedProducts.push(await db.Product.create(pd));
        }
        // Aliases for backward compatibility
        const p1 = insertedProducts[0];  // Kombi 24kW
        const p2 = insertedProducts[9];  // Çelik Boru 1/2
        const p3 = insertedProducts[6];  // Radyatör 60x120
        const p4 = insertedProducts[44]; // Koli Bandı
        const p5 = insertedProducts[41]; // Lehim Seti
        const p6 = insertedProducts[18]; // Kablo 3x2.5
        const p7 = insertedProducts[21]; // Priz

        // ─────────────────────────────────────────
        // 4. KAYNAKLAR
        // ─────────────────────────────────────────
        const s1 = await db.Source.create({ name: 'Merkez Depo',          type: 'warehouse', color_code: '#10b981' });
        const s2 = await db.Source.create({ name: 'Koçtaş Beylikdüzü',    type: 'supplier',  color_code: '#f59e0b' });
        const s3 = await db.Source.create({ name: 'Yüksel Hırdavat',      type: 'supplier',  color_code: '#ef4444' });
        const s4 = await db.Source.create({ name: 'Araç 1 (34 ABC 123)',  type: 'vehicle',   color_code: '#3b82f6' });
        const s5 = await db.Source.create({ name: 'Araç 2 (34 XYZ 987)',  type: 'vehicle',   color_code: '#6366f1' });
        const s6 = await db.Source.create({ name: 'Aydın Aydınlatma',     type: 'supplier',  color_code: '#ec4899' });
        const s7 = await db.Source.create({ name: 'Teknik Malzeme A.Ş.',  type: 'supplier',  color_code: '#8b5cf6' });
        const s8 = await db.Source.create({ name: 'Depo 2 (Şişli)',       type: 'warehouse', color_code: '#14b8a6' });
        const allSources = [s1, s2, s3, s4, s5, s6, s7, s8];

        // ─────────────────────────────────────────
        // 5. PERSONELLER (detaylı)
        // ─────────────────────────────────────────
        const employeeData = [
            { full_name: 'Hüseyin Çalışkan', position: 'Kıdemli Usta',     phone: '05321234001', salary: 38000, hire_date: '2020-03-10' },
            { full_name: 'Kadir Hızlı',       position: 'Tesisat Ustası',   phone: '05321234002', salary: 34000, hire_date: '2021-06-15' },
            { full_name: 'Recep Demir',        position: 'Elektrik Ustası',  phone: '05321234003', salary: 32000, hire_date: '2021-09-01' },
            { full_name: 'Mehmet Yılmaz',      position: 'Kalfa',            phone: '05321234004', salary: 26000, hire_date: '2022-01-15' },
            { full_name: 'Ali Kaya',           position: 'Çırak',            phone: '05321234005', salary: 18000, hire_date: '2023-03-01' },
            { full_name: 'Veli Gürbüz',        position: 'Şoför',            phone: '05321234006', salary: 24000, hire_date: '2022-05-20' },
            { full_name: 'Kerem Can',          position: 'Mühendis',         phone: '05321234007', salary: 48000, hire_date: '2020-09-01' },
            { full_name: 'Serhat Öz',          position: 'Usta',             phone: '05321234008', salary: 33000, hire_date: '2021-11-10' },
            { full_name: 'Tarık Arslan',       position: 'Kalfa',            phone: '05321234009', salary: 25000, hire_date: '2022-07-01' },
            { full_name: 'Burak Doğan',        position: 'Depo Görevlisi',   phone: '05321234010', salary: 22000, hire_date: '2023-01-05' },
            { full_name: 'İbrahim Şahin',      position: 'Tesisat Ustası',   phone: '05321234011', salary: 35000, hire_date: '2020-06-20' },
            { full_name: 'Oğuz Yıldız',        position: 'Elektrik Kalfa',   phone: '05321234012', salary: 27000, hire_date: '2022-12-01' },
        ];
        const employees = [];
        for (const ed of employeeData) {
            employees.push(await db.Employee.create(ed));
        }

        // ─────────────────────────────────────────
        // 6. ÖDEME HESAPLARI
        // ─────────────────────────────────────────
        await db.PaymentAccount.create({ name: 'Nakit Kasa',       type: 'cash' });
        await db.PaymentAccount.create({ name: 'Garanti Bankası',  type: 'bank' });
        await db.PaymentAccount.create({ name: 'İş Bankası',       type: 'bank' });
        await db.PaymentAccount.create({ name: 'Ziraat Bankası',   type: 'bank' });

        // ─────────────────────────────────────────
        // 7. YOKLAMA (30 gün geriye dön)
        // ─────────────────────────────────────────
        const today = new Date();
        for (let d = 0; d < 30; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() - d);
            for (const e of employees) {
                const rand = Math.random();
                let status = 'present';
                if (rand > 0.88)      status = 'absent';
                else if (rand > 0.78) status = 'half_day';
                const note = status === 'present' ? 'Şantiye' :
                             status === 'absent'  ? 'Mazeret izni' : 'Yarım gün';
                await db.Attendance.create({ employee_id: e.id, date, status, note });
            }
        }

        // ─────────────────────────────────────────
        // 8. İLK STOK GİRİŞLERİ (ürünlerin mevcut stoku kaynaklansın)
        // ─────────────────────────────────────────
        for (const product of insertedProducts) {
            if (product.current_stock > 0) {
                await db.StockMovement.create({
                    product_id: product.id,
                    source_id: s1.id,
                    user_id: admin.id,
                    movement_type: 'in',
                    quantity: product.current_stock,
                    unit: product.unit,
                    note: 'İlk stok girişi',
                    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
                });
            }
        }

        // ─────────────────────────────────────────
        // 9. DETAYLI İŞ LİSTELERİ (elle oluşturulmuş, gerçekçi)
        // ─────────────────────────────────────────
        const realJobs = [
            { title: 'Beylikdüzü Sitesi – Kombi Değişimi (12 Daire)', status: 'processing', user: admin },
            { title: 'Kadıköy Ofis Binası – Komple Elektrik Tadilatı', status: 'pending',    user: user1 },
            { title: 'Bağcılar Fabrika – Kazan Dairesi Tadilatı',      status: 'completed',  user: admin },
            { title: 'Kartal Site A Blok – Su Tesisatı Yenileme',      status: 'processing', user: user1 },
            { title: 'Bakırköy Hastane – LED Aydınlatma Projesi',      status: 'completed',  user: admin },
        ];
        const createdJobs = [];
        for (const rj of realJobs) {
            createdJobs.push(await db.JobList.create({ title: rj.title, status: rj.status, created_by_user_id: rj.user.id }));
        }
        const [j1, j2, j3, j4, j5] = createdJobs;

        // Views
        for (const j of createdJobs) {
            await db.JobView.create({ job_list_id: j.id, user_id: admin.id });
            await db.JobView.create({ job_list_id: j.id, user_id: user1.id });
        }

        // İş listesi kalemleri – J1 (İşlemde – kısmi)
        const j1Items = [
            [p1, s1, 12, 12, true,  'Adet', '12 kombi teslim'],
            [p2, s1, 200, 200, true,  'Metre', 'Boru tamamlandı'],
            [insertedProducts[13], s2, 24, 12, false, 'Adet', 'Yarı geldi'],
            [insertedProducts[14], s2, 12, 0,  false, 'Adet', 'Bekleniyor'],
            [insertedProducts[8],  s1, 6,  6,  true,  'Adet', null],
        ];
        for (const [prod, src, qty, qtyF, checked, unit, note] of j1Items) {
            await db.JobItem.create({ job_list_id: j1.id, product_id: prod.id, source_id: src.id, added_by: admin.id, quantity: qty, quantity_found: qtyF, is_checked: checked, is_deleted: false, unit, note });
        }
        await db.JobItemDeletion.create({ job_list_id: j1.id, product_id: p5.id, product_name: 'Lehim Seti', source_name: 'Merkez Depo', quantity: 2, deleted_by_user_id: admin.id, reason: 'Şantiyede zaten mevcut' });

        // J2 (Bekliyor)
        for (const prod of [insertedProducts[18], insertedProducts[21], insertedProducts[22], insertedProducts[23]]) {
            await db.JobItem.create({ job_list_id: j2.id, product_id: prod.id, source_id: s2.id, added_by: user1.id, quantity: Math.floor(Math.random()*30)+5, quantity_found: 0, is_checked: false, is_deleted: false, unit: prod.unit });
        }

        // J3 (Tamamlandı)
        for (const prod of [insertedProducts[0], insertedProducts[5], insertedProducts[9], insertedProducts[11]]) {
            const qty = Math.floor(Math.random()*10)+2;
            await db.JobItem.create({ job_list_id: j3.id, product_id: prod.id, source_id: s1.id, added_by: admin.id, quantity: qty, quantity_found: qty, is_checked: true, is_deleted: false, unit: prod.unit });
        }

        // J4 (İşlemde)
        const j4prods = [insertedProducts[10], insertedProducts[13], insertedProducts[15], insertedProducts[16], insertedProducts[36]];
        for (let i = 0; i < j4prods.length; i++) {
            const qty = Math.floor(Math.random()*15)+3;
            await db.JobItem.create({ job_list_id: j4.id, product_id: j4prods[i].id, source_id: s1.id, added_by: user1.id, quantity: qty, quantity_found: i < 2 ? qty : 0, is_checked: i < 2, is_deleted: false, unit: j4prods[i].unit });
        }

        // J5 (Tamamlandı – LED projesi)
        for (const prod of [insertedProducts[26], insertedProducts[27], insertedProducts[28], insertedProducts[29]]) {
            const qty = Math.floor(Math.random()*20)+10;
            await db.JobItem.create({ job_list_id: j5.id, product_id: prod.id, source_id: s6.id, added_by: admin.id, quantity: qty, quantity_found: qty, is_checked: true, is_deleted: false, unit: prod.unit });
        }

        // ─────────────────────────────────────────
        // 10. TOPLU STOK HAREKETLERİ (250 kayıt, 60 gün)
        // ─────────────────────────────────────────
        const employeeNames = employees.map(e => e.full_name);
        const destinations  = ['Beylikdüzü Şantiyesi', 'Kadıköy Ofis', 'Bağcılar Fabrika', 'Kartal Site', 'Bakırköy Hastane', 'Merkez Depo'];
        const notes = ['Müşteri talebi', 'Rutin çıkış', 'Acil sipariş', 'İade alımı', 'Depo transferi', 'Şantiye malzeme', 'Proje başlangıcı', 'Stok tamamlama'];

        for (let i = 0; i < 250; i++) {
            const randomProduct = insertedProducts[Math.floor(Math.random() * insertedProducts.length)];
            const isIn   = Math.random() > 0.38;
            const isMetre = randomProduct.unit === 'Metre';
            const isKutu  = randomProduct.unit === 'Kutu';
            const isKg    = randomProduct.unit === 'Kg';
            const maxQty  = isMetre ? 250 : (isKutu ? 8 : (isKg ? 12 : 25));
            const qty     = Math.floor(Math.random() * maxQty) + 1;
            const srcRnd  = allSources[Math.floor(Math.random() * allSources.length)];
            const daysAgo = Math.floor(Math.random() * 60);
            const person  = employeeNames[Math.floor(Math.random() * employeeNames.length)];
            const note    = notes[Math.floor(Math.random() * notes.length)];
            const dest    = destinations[Math.floor(Math.random() * destinations.length)];

            await db.StockMovement.create({
                product_id:    randomProduct.id,
                source_id:     srcRnd.id,
                user_id:       admin.id,
                movement_type: isIn ? 'in' : 'out',
                quantity:      qty,
                unit:          randomProduct.unit,
                brought_by:    isIn  ? person : null,
                taken_by:      !isIn ? person : null,
                source_location: isIn  ? srcRnd.name : null,
                destination:   !isIn ? dest : null,
                note,
                date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
            });
        }

        // ─────────────────────────────────────────
        // 11. EK İŞ LİSTELERİ (otomatik üretilen 20 adet)
        // ─────────────────────────────────────────
        const extraJobTitles = [
            'Şişli Rezidans – Kombi Bakımı', 'Maltepe Villa – Tesisat Revizyonu',
            'Ataşehir Ofis – Klima Montajı', 'Ümraniye Dükkan – Elektrik Panosu',
            'Sancaktepe Fabrika – Boru Yenileme', 'Tuzla Depo – Aydınlatma Değişimi',
            'Pendik Hastane – Isı Sayacı', 'Sultanbeyli Okul – Tesisat Bakımı',
            'Gebze Site – Radyatör Montajı', 'Darıca İşyeri – Klima Servisi',
            'Çekmeköy Bina – Komple Yenileme', 'Beykoz Villa – Havuz Tesisatı',
            'Şile Tatil Köyü – Isıtma Sistemi', 'Silivri Çiftlik – Su Pompa Sistemi',
            'Büyükçekmece Site B Blok – Tesisat', 'Avcılar Okul – LED Dönüşümü',
            'Beyoğlu Atölye – Elektrik Tadilatı', 'Gaziosmanpaşa APT – Kalorifer',
            'Zeytinburnu İşhanı – Havalandırma', 'Eyüp Fabrika – Kombi Değişimi',
        ];

        for (let i = 0; i < extraJobTitles.length; i++) {
            const statusArr = ['pending', 'processing', 'completed'];
            const chosenStatus = statusArr[i % 3];
            const jExtra = await db.JobList.create({ title: extraJobTitles[i], created_by_user_id: i % 2 === 0 ? admin.id : user1.id, status: chosenStatus });
            await db.JobView.create({ job_list_id: jExtra.id, user_id: admin.id });
            await db.JobView.create({ job_list_id: jExtra.id, user_id: user1.id });

            const numItems = Math.floor(Math.random() * 8) + 3;
            for (let k = 0; k < numItems; k++) {
                const rProd = insertedProducts[Math.floor(Math.random() * insertedProducts.length)];
                const qty   = Math.floor(Math.random() * 25) + 1;
                const qtyF  = chosenStatus === 'completed' ? qty : (chosenStatus === 'processing' ? Math.floor(Math.random() * qty) : 0);
                const chk   = chosenStatus === 'completed' ? true : (chosenStatus === 'processing' && qtyF === qty && Math.random() > 0.4);
                await db.JobItem.create({ job_list_id: jExtra.id, product_id: rProd.id, source_id: s1.id, added_by: admin.id, quantity: qty, quantity_found: qtyF, is_checked: chk, is_deleted: false, unit: rProd.unit });
            }
        }

        console.log('✅ Veriler başarıyla yüklendi!');
        console.log(`   → ${insertedProducts.length} ürün (barkoduyla)`);
        console.log(`   → ${allSources.length} kaynak`);
        console.log(`   → ${employees.length} personel`);
        console.log(`   → ${createdJobs.length + extraJobTitles.length} iş listesi`);
        console.log('   → 250 stok hareketi');
        console.log(`   → 30 günlük yoklama (${employees.length * 30} kayıt)`);
        return true;
    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        throw error;
    }
}

module.exports = seed;
