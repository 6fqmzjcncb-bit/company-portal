# 🚀 cPanel'e Hızlı Yükleme Rehberi

## 📦 ADIM 1: FTP İstemcisi İndirin (Ücretsiz)

**FileZilla** (Önerilen):
- İndirme: https://filezilla-project.org/download.php?type=client
- Mac için Client versiyonu indirin

## 🔐 ADIM 2: FTP Bilgilerinizi Bulun

1. **cPanel'e** giriş yapın
2. **"FTP Accounts"** araması yapın
3. Bilgilerinizi not edin:
   ```
   Host: ftp.yourdomain.com (veya hosting IP adresi)
   Username: cPanel kullanıcı adınız
   Password: cPanel şifreniz
   Port: 21
   ```

## 📤 ADIM 3: Dosyaları Yükleyin

### FileZilla ile Bağlantı:
1. FileZilla'yı açın
2. Üst kısımda:
   - **Host**: ftp.yourdomain.com
   - **Username**: kullanıcı adınız
   - **Password**: şifreniz
   - **Port**: 21
3. **"Quickconnect"** tıklayın

### Dosya Yükleme:
**Sağ tarafta (sunucu):**
- `public_html` klasörüne gidin
- `company-portal` isimli yeni klasör oluşturun
- İçine girin

**Sol tarafta (bilgisayarınız):**
- `/Users/emrecihangir/.gemini/antigravity/scratch/company-portal` klasörüne gidin

**Şu dosya ve klasörleri sağ tarafa sürükleyin:**
```
✅ server/ (klasör)
✅ public/ (klasör)  
✅ package.json
✅ .env
✅ .htaccess
✅ .gitignore
```

**❌ YÜKLEMEYIN:**
```
❌ node_modules/
❌ database/portal.db (boş database/ klasörü yükleyin)
❌ README.md (opsiyonel)
```

## ⚙️ ADIM 4: cPanel'de Node.js Kurulumu

1. cPanel ana sayfasına dönün
2. **"Setup Node.js App"** seçeneğine tıklayın
3. **"CREATE APPLICATION"** tıklayın

**Şu bilgileri girin:**
```
Node.js version: 18.x veya 20.x
Application mode: Production
Application root: company-portal
Application URL: yourdomain.com (veya portal.yourdomain.com)
Application startup file: server/server.js
```

4. **"CREATE"** butonuna tıklayın

## 🔧 ADIM 5: Environment Variables

Node.js App sayfasında:

**"Environment Variables"** bölümüne gidin

**ADD VARIABLE** ile şunları ekleyin:
```
PORT = 3000
SESSION_SECRET = your-super-secret-random-string-123
NODE_ENV = production
```

## 📦 ADIM 6: Bağımlılıkları Yükle

**İki yöntem var:**

### Yöntem A: Otomatik (Kolay)
Node.js App sayfasında **"Run NPM Install"** butonuna tıklayın

### Yöntem B: Terminal
cPanel'de **"Terminal"** araması yapın:
```bash
cd company-portal
npm install --production
```

## 🗄️ ADIM 7: Veritabanı Kurulumu

**Terminal'de:**
```bash
cd ~/company-portal
node server/setup.js
```

Başarılı mesajı göreceksiniz:
```
✓ Tablolar oluşturuldu
✓ Kullanıcılar oluşturuldu
✓ Kaynaklar oluşturuldu
✓ Ürünler oluşturuldu
KURULUM BAŞARIYLA TAMAMLANDI
```

## ▶️ ADIM 8: Uygulamayı Başlatın

Node.js App sayfasında:

**"RESTART"** butonuna tıklayın

Durum **"Running"** olarak görünmeli (yeşil)

## 🌐 ADIM 9: Tarayıcıda Test Edin

```
https://yourdomain.com
```

**Giriş Bilgileri:**
```
Kullanıcı: admin
Şifre: admin123
```

---

## ✅ Tamamdır!

Portal'iniz artık canlıda! 🎉

---

## 🔄 Güncelleme Yapmak İsterseniz

1. FileZilla ile değişen dosyaları yükleyin
2. cPanel Node.js App sayfasında **"RESTART"** tıklayın

---

## ❌ Sorun Giderme

### "Application not found" Hatası
- Application root path'in doğru olduğundan emin olun: `company-portal`

### "Cannot find module" Hatası
- `npm install --production` komutunu tekrar çalıştırın

### 500 Internal Server Error
- `.htaccess` dosyasının yüklendiğinden emin olun
- Terminal'de log kontrol edin: `cat ~/logs/company-portal.log`

### Veritabanı Hatası
```bash
cd ~/company-portal
chmod 755 database
rm -f database/portal.db
node server/setup.js
```

---

## 📞 Yardıma İhtiyacınız Olursa

Hangi adımda takıldığınızı ve hata mesajını paylaşın!
