# 🚀 Railway.app Deployment Rehberi

## ✅ ADIM 1: GitHub Hesabı (Gerekli)

Railway, GitHub ile çalışır. GitHub hesabınız var mı?

### GitHub Hesabınız Varsa:
- ✅ ADIM 2'ye geçin

### GitHub Hesabınız Yoksa:
1. https://github.com adresine gidin
2. **Sign up** (Kaydol) tıklayın
3. Email, kullanıcı adı, şifre girin
4. Email doğrulama yapın
5. Ücretsiz plan seçin

---

## ✅ ADIM 2: Railway.app'e Giriş Yapın

Railway.app sitesi açıkken:

1. Sağ üstte **"Login"** veya **"Start a New Project"** butonunu bulun
2. **"Login with GitHub"** (GitHub ile Giriş) seçeneğine tıklayın
3. GitHub hesabınızla giriş yapın
4. Railway'e izin verin (Authorize Railway)

---

## ✅ ADIM 3: Yeni Proje Oluşturun

Railway dashboard'da:

1. **"New Project"** (Yeni Proje) butonuna tıklayın
2. **"Deploy from GitHub repo"** SEÇMEYİN
3. **"Empty Project"** (Boş Proje) veya **"Deploy a Template"** → **"Empty Service"** seçin

---

## ✅ ADIM 4: Dosyaları Yükleyin

### Yöntem A: GitHub Repository (Önerilen)

**a) GitHub'da Yeni Repo Oluşturun:**
1. GitHub'a gidin → **"New repository"**
2. İsim: `company-portal`
3. **Public** veya **Private** (önemli değil)
4. **Create repository**

**b) Dosyaları GitHub'a Yükleyin:**

Terminal'de (endişelenme, sadece upload için):
```bash
cd /Users/emrecihangir/.gemini/antigravity/scratch/company-portal
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICIADIN/company-portal.git
git push -u origin main
```

**c) Railway'de GitHub Repo Bağla:**
1. Railway projesinde **"+ New"** → **"GitHub Repo"**
2. `company-portal` repository'sini seçin
3. Otomatik deployment başlayacak

### Yöntem B: Railway CLI (Terminal)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Yöntem C: Manuel (En Kolay ama Önerilmez)

Railway bazı dosyaları doğrudan yükletebilir. Dashboard'da "Settings" bölümünden kontrol edin.

---

## ✅ ADIM 5: Environment Variables Ekleyin

Railway dashboard'da:

1. Projenize tıklayın
2. **"Variables"** sekmesine gidin
3. Şu değişkenleri ekleyin:

```
PORT=3000
SESSION_SECRET=railway-super-secret-key-production-2026
NODE_ENV=production
```

Her bir değişken için **"New Variable"** butonuna tıklayın.

---

## ✅ ADIM 6: Build Komutlarını Ayarlayın

**Settings** → **Deploy** bölümünde:

**Start Command:**
```
node server/server.js
```

**Install Command:**
```
npm install
```

**Build Command:**
```
node server/setup.js
```

---

## ✅ ADIM 7: Deploy Edin

1. **"Deploy"** butonuna tıklayın
2. Deployment loglarını izleyin
3. Başarılı olunca yeşil ✅ işareti görünecek

Railway size bir URL verecek: `https://yourapp.railway.app`

---

## ✅ ADIM 8: Test Edin

Railway URL'ini tarayıcıda açın:
```
https://yourapp.railway.app
```

**Giriş yapın:**
- Kullanıcı: `admin`
- Şifre: `admin123`

Her şey çalışıyorsa ADIM 9'a geçin! 🎉

---

## ✅ ADIM 9: Custom Domain Bağlayın (tksportal.com)

### Railway'de Domain Ayarı:

1. Railway dashboard → **Settings** → **Domains**
2. **"Custom Domain"** butonuna tıklayın
3. `tksportal.com` yazın
4. Railway size **DNS kayıtları** verecek (örn: CNAME veya A Record)

### turkticaret.net'te DNS Ayarı:

1. **cPanel** veya **turkticaret müşteri paneli**ne gidin
2. **"Zone Editor"** veya **"DNS Yönetimi"** bulun
3. Şu kayıtları ekleyin (Railway'in verdiği bilgilere göre):

**CNAME Yöntemi:**
```
Type: CNAME
Name: @
Value: yourapp.railway.app
```

**A Record Yöntemi (Railway IP verirse):**
```
Type: A
Name: @
Value: Railway IP adresi
```

4. **Save** (Kaydet)

### Bekleme Süresi:
DNS yayılması **5-30 dakika** sürebilir.

---

## ✅ ADIM 10: SSL Sertifikası

Railway otomatik olarak **ücretsiz SSL** sağlar. `https://tksportal.com` otomatik çalışacak! ✅

---

## 🎉 Tamamdır!

Artık `https://tksportal.com` adresinden portal uygulamanıza erişebilirsiniz!

---

## 🔄 Güncelleme Yapmak İsterseniz

GitHub repo'nuzu güncelleyin:
```bash
git add .
git commit -m "Güncelleme mesajı"
git push
```

Railway otomatik olarak yeni versiyonu deploy edecek!

---

## 💰 Maliyet

Railway ücretsiz planı:
- ✅ 500 saat/ay (hobby projeler için yeterli)
- ✅ Sınırsız deployment
- ✅ SSL dahil

Daha fazla ihtiyaç olursa $5/ay'dan başlayan planlar var.

---

## 📞 Sorun Giderme

### Deployment Başarısız Olursa:
- Build loglarına bakın
- `package.json` dosyasının doğru olduğundan emin olun

### Database Hatası:
- Railway'de "Volumes" oluşturun (Settings → Volumes)
- `/app/database` path'ini mount edin

### Port Hatası:
- Railway otomatik PORT atar, `process.env.PORT` kullandığımız için sorun olmaz

---

## ✨ İpuçları

1. **GitHub Integration** kullanın - otomatik deployment çok pratik
2. **Railway CLI** kurarsanız terminal'den kontrol edebilirsiniz
3. **Logs** bölümünden canlı logları izleyebilirsiniz
4. **Metrics** bölümünden CPU/RAM kullanımını görebilirsiniz
