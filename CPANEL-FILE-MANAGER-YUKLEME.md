# 📤 cPanel File Manager ile Dosya Yükleme Rehberi

## ✅ ADIM 1: public_html Klasörüne Girin

File Manager'da **sol tarafta** `public_html` klasörünü bulun ve **çift tıklayın**.

---

## ✅ ADIM 2: company-portal Klasörü Oluşturun

1. Üst menüde **"+ Folder"** butonuna tıklayın
2. Klasör adı: **`company-portal`** yazın
3. **"Create New Folder"** tıklayın

---

## ✅ ADIM 3: company-portal Klasörüne Girin

Yeni oluşturduğunuz **`company-portal`** klasörüne **çift tıklayın** (klasörün içine girin).

---

## ✅ ADIM 4: Dosyaları Yükleyin

`company-portal` klasörünün içindeyken:

1. Üst menüde **"Upload"** butonuna tıklayın
2. Açılan sayfada **"Dosya Seç"** veya **"Select File"** tıklayın
3. Bilgisayarınızdan şu konuma gidin:
   ```
   /Users/emrecihangir/.gemini/antigravity/scratch/company-portal
   ```

4. **Şu dosya ve klasörleri seçin:**
   - ✅ `server` klasörü (tüm içeriğiyle)
   - ✅ `public` klasörü (tüm içeriğiyle)
   - ✅ `package.json`
   - ✅ `.env`
   - ✅ `.htaccess`

5. **"Open"** veya **"Aç"** tıklayın
6. Yükleme otomatik başlayacak

**NOT**: Klasörleri yüklemek için önce klasörü sıkıştırmanız (zip) gerekebilir.

---

## 🗜️ ALTERNATİF: ZIP ile Yükleme (Daha Kolay)

### A) Bilgisayarınızda ZIP Oluşturun:

1. **Finder**'da `/Users/emrecihangir/.gemini/antigravity/scratch/company-portal` konumuna gidin
2. Şu öğeleri seçin:
   - `server` klasörü
   - `public` klasörü
   - `package.json`
   - `.env`
   - `.htaccess`
3. Sağ tık → **"Sıkıştır"** (Compress)
4. `Archive.zip` dosyası oluşacak

### B) ZIP'i Yükleyin:

1. File Manager'da `company-portal` klasörünün içindeyken
2. **"Upload"** → `Archive.zip` dosyasını seçin
3. Yükleme tamamlandıktan sonra
4. File Manager'da `Archive.zip` dosyasına **sağ tık**
5. **"Extract"** (Arşivden Çıkar) seçin
6. ZIP dosyasını silebilirsiniz

---

## ✅ ADIM 5: Dosya Yapısını Kontrol Edin

File Manager'da şu yapıyı görmelisiniz:

```
public_html/
└── company-portal/
    ├── server/
    │   ├── config/
    │   ├── models/
    │   ├── routes/
    │   ├── middleware/
    │   ├── server.js
    │   └── setup.js
    ├── public/
    │   ├── css/
    │   ├── js/
    │   ├── index.html
    │   └── ... (diğer html dosyaları)
    ├── package.json
    ├── .env
    └── .htaccess
```

---

## ➡️ Sonraki Adım

Dosyalar yüklendikten sonra **Terminal** kullanarak kurulumu tamamlayacağız!

Dosyalar yüklendiğinde bana haber verin! 🚀
