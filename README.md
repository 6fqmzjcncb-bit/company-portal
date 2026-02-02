# Şirket Portalı - Kurulum ve Kullanım Kılavuzu

## ✅ Tamamlanan İşlemler

Tam çalışır bir **Şirket Portalı Stok ve İş Listesi Yönetim Sistemi** oluşturuldu:

### Özellikler
- ✅ Kullanıcı giriş sistemi (Admin ve Personel rolleri)
- ✅ Renkli kaynak yönetimi (Merkez Depo, Koçtaş vb.)
- ✅ **Stoklu ürünler** VE **serbest yazı (hatırlatıcı)** ekleme
- ✅ İş listesi oluşturma ve kaynağa göre gruplu görüntüleme
- ✅ "Kim, ne zaman işaretledi?" takibi
- ✅ Otomatik stok düşümü (sadece iç depodaki ürünler için)
- ✅ Modern, responsive ve mobil uyumlu tasarım

### Teknoloji
- **Backend**: Node.js + Express + SQLite
- **Frontend**: Modern HTML/CSS/JavaScript
- **Veritabanı**: SQLite (tek dosya, kolay yedekleme)

---

## 📋 Kurulum Adımları

### 1. Node.js Kurulumu

Sisteminizde Node.js yüklü değil. Önce Node.js'i kurmanız gerekiyor:

**Mac için:**
```bash
# Homebrew ile (önerilen)
brew install node

# VEYA resmi web sitesinden indirin
# https://nodejs.org/
```

Kurulum sonrası kontrol edin:
```bash
node --version
npm --version
```

### 2. Proje Klasörüne Gidin

```bash
cd /Users/emrecihangir/.gemini/antigravity/scratch/company-portal
```

### 3. Bağımlılıkları Yükleyin

```bash
npm install
```

Bu komut gerekli tüm paketleri indirecek (~2-3 dakika sürebilir).

### 4. Veritabanını Kurun

```bash
npm run setup
```

Bu komut:
- SQLite veritabanını oluşturacak
- Örnek kullanıcıları ekleyecek (admin, staff)
- Örnek kaynakları ekleyecek (Merkez Depo, Koçtaş vb.)
- Örnek ürünleri ekleyecek
- Demo iş listesi oluşturacak

### 5. Sunucuyu Başlatın

```bash
npm start
```

Ekranda şöyle bir mesaj göreceksiniz:
```
╔════════════════════════════════════════╗
║   ŞİRKET PORTALI - BAŞARILI BAŞLATILD  ║
╚════════════════════════════════════════╝

🌐 Sunucu çalışıyor: http://localhost:3000
```

### 6. Tarayıcıda Açın

Tarayıcınızda şu adresi açın:
```
http://localhost:3000
```

---

## 🔐 Giriş Bilgileri

### Admin Kullanıcısı
- **Kullanıcı Adı**: admin
- **Şifre**: admin123
- **Yetkiler**: Tüm işlemler + Stok görme + Kullanıcı yönetimi

### Personel Kullanıcısı
- **Kullanıcı Adı**: staff
- **Şifre**: staff123
- **Yetkiler**: İş listesi görme/işaretleme

---

## 📱 Kullanım Kılavuzu

### 1. İş Listesi Oluşturma

1. **İş Listeleri** sayfasına gidin
2. **+ Yeni Liste Oluştur** butonuna tıklayın
3. Liste başlığı girin (örn: "Beylikdüzü Şantiyesi - Tesisat")
4. Enter'a basın

### 2. Kalem Ekleme (Stoklu veya Serbest Yazı)

İş listesi detay sayfasında **+ Kalem Ekle** butonuna tıklayın.

#### Stoktan Seçim:
1. **Stoktan Seç** butonunu tıklayın
2. Ürün adı veya barkod yazarak arayın
3. Listeden ürünü seçin
4. Kaynağı seçin (örn: Merkez Depo)
5. Miktarı girin
6. **Ekle** butonuna tıklayın

#### Serbest Yazı (Hatırlatıcı):
1. **Özel Yazı** butonunu tıklayın
2. Özel isim girin (örn: "1 Kutu Vida", "Koli Bandı", "Matkabı unutma")
3. Kaynağı seçin (örn: Koçtaş)
4. Miktarı girin
5. **Ekle** butonuna tıklayın

> **Not**: Serbest yazı ile eklediğiniz kalemler stoktan düşmez, sadece hatırlatıcıdır.

### 3. Kalem İşaretleme

İş listesi detay sayfasında:
1. Hazırladığınız kalemin yanındaki **☐ Alındı İşaretle** butonuna tıklayın
2. Onaylayın
3. Sistem otomatik olarak:
   - Kalemin durumunu "✓ Hazır" olarak işaretler
   - Sizin adınızı ve zamanı kaydeder
   - Eğer iç depodaki stoklu bir ürünse, stoğu düşer

### 4. Renkli Gruplandırma

İş listesi detay sayfasında tüm kalemler **kaynağa göre** renkli kutucuklarda gruplu görünür:

```
┌─ Merkez Depo (Yeşil) ───────┐
│ • Kombi 24kW (2 adet)       │
│ • Radyatör (8 adet)          │
└──────────────────────────────┘

┌─ Koçtaş (Sarı) ─────────────┐
│ • 1 Kutu Vida (1 adet)      │
│ • Koli Bandı (2 adet)       │
└──────────────────────────────┘
```

### 5. Admin Paneli (Sadece Admin)

Admin olarak giriş yaptıysanız:
- **Yönetim** menüsünden stok durumunu görebilirsiniz
- Yeni kullanıcı ekleyebilirsiniz
- Tüm stok miktarlarını görebilirsiniz

---

## 🎨 Özellikler

### Otomatik Stok Düşümü
- Sadece **iç depodaki** (internal) ürünler için çalışır
- Dış tedarikçilerden (Koçtaş, vb.) alınan ürünler stok düşümüne tabi değildir
- İşaretlendiği anda otomatik düşer

### Kim, Ne Zaman İşaretledi?
Her işaretlenmiş kalemin yanında:
- İşaretleyen kişinin adı
- İşaretleme tarihi ve saati
görünür.

### Responsive Tasarım
- Bilgisayar, tablet ve mobil cihazlarda mükemmel çalışır
- Modern gradient arkaplanlar
- Smooth animasyonlar

---

## 🔄 Sunucuyu Durdurmak

Terminal'de **Ctrl + C** tuşlarına basın.

---

## 🗂️ Veritabanı Yedekleme

Veritabanınız burada:
```
/Users/emrecihangir/.gemini/antigravity/scratch/company-portal/database/portal.db
```

Bu dosyayı kopyalayarak yedek alabilirsiniz:
```bash
cp database/portal.db database/portal-backup-$(date +%Y%m%d).db
```

---

## 🌐 Web Sunucusuna Yükleme (İleride)

Satın aldığınız web sitesine yüklemek için:

1. **Shared Hosting** (cPanel): Node.js uygulaması olarak kurulum
2. **VPS** (Ubuntu): PM2 + Nginx ile deployment
3. **Cloud** (Heroku, Railway): Git ile otomatik deploy

Detaylı yükleme talimatlarını ihtiyaç duyduğunuzda sağlayabilirim.

---

## 📱 Mobil Uygulama (Gelecek)

Web sitesi başarıyla çalıştıktan sonra, aynı sistemi **React Native** ile mobil uygulamaya dönüştürebiliriz.

---

## ❓ Sorun Giderme

### Sunucu başlamıyor
```bash
# Port zaten kullanılıyorsa farklı port deneyin
PORT=3001 npm start
```

### Veritabanı hatası
```bash
# Veritabanını sıfırlayın
rm -f database/portal.db
npm run setup
```

### Bağımlılık hatası
```bash
# Temiz kurulum
rm -rf node_modules
npm install
```

---

## 📞 İletişim

Herhangi bir sorunuz veya ek özellik isteğiniz olursa bana bildirin!

**Oluşturan**: Antigravity AI
**Tarih**: 2 Şubat 2026
