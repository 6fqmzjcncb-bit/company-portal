// Global değişkenler
let jobId = null;
let currentUser = null;
let itemType = 'stock'; // 'stock' veya 'custom'
let sources = [];

// URL'den job ID al
const urlParams = new URLSearchParams(window.location.search);
jobId = urlParams.get('id');

if (!jobId) {
    alert('İş listesi ID bulunamadı');
    window.location.href = '/jobs.html';
}

// Auth kontrol
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            window.location.href = '/index.html';
            return null;
        }
        return await response.json();
    } catch (error) {
        window.location.href = '/index.html';
        return null;
    }
}

// Logout
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

// Alert göster
function showAlert(message, type = 'error') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.innerHTML = '';
    container.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Kullanıcı bilgilerini yükle
async function loadUserInfo() {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent =
        currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (currentUser.role === 'admin') {
        document.getElementById('adminLink').style.display = 'block';
    }
}

// Kaynakları yükle
async function loadSources() {
    try {
        const response = await fetch('/api/sources');
        sources = await response.json();

        const select = document.getElementById('sourceSelect');
        select.innerHTML = '<option value="">Kaynak seçin...</option>';
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = source.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Sources load error:', error);
    }
}

// İş listesi detayını yükle
async function loadJobDetail() {
    try {
        const response = await fetch(`/api/jobs/${jobId}`);

        if (!response.ok) {
            throw new Error('İş listesi bulunamadı');
        }

        const jobData = await response.json();

        document.getElementById('jobTitle').textContent = jobData.title;

        // Gruplanmış kalemleri göster
        renderGroupedItems(jobData.groupedItems);

    } catch (error) {
        console.error('Job detail load error:', error);
        showAlert('İş listesi yüklenemedi', 'error');
    }
}

// Gruplanmış kalemleri render et
function renderGroupedItems(groupedItems) {
    const container = document.getElementById('groupedItems');

    if (!groupedItems || groupedItems.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Henüz kalem eklenmemiş</p>';
        return;
    }

    container.innerHTML = groupedItems.map(group => {
        const source = group.source;
        const items = group.items;

        return `
      <div class="card card-colored mb-3" style="border-left-color: ${source.color_code}; background-color: ${source.color_code}15;">
        <div class="card-header" style="background-color: ${source.color_code};">
          <strong>${source.name}</strong>
          <span class="badge badge-secondary">${items.length} kalem</span>
        </div>
        <div class="card-body">
          ${items.map(item => renderJobItem(item)).join('')}
        </div>
      </div>
    `;
    }).join('');
}

// Tek bir job item render et
function renderJobItem(item) {
    const itemName = item.product ? item.product.name : item.custom_name;
    const isChecked = item.is_checked;

    return `
    <div class="job-item" id="item-${item.id}">
      <div class="item-info">
        <div class="item-name">
          ${itemName}
          ${item.product && item.product.barcode ? `<span class="text-muted text-sm">(${item.product.barcode})</span>` : ''}
        </div>
        <div class="item-meta">
          Miktar: ${item.quantity}
          ${item.product ? ' (Stoklu)' : ' (Serbest Yazı)'}
        </div>
      </div>
      <div class="item-actions">
        ${isChecked ? `
          <div class="check-info">
            <div class="check-status">
              ✓ Hazır
            </div>
            <div class="check-meta">
              ${item.checkedBy.full_name}<br>
              ${new Date(item.checked_at).toLocaleString('tr-TR')}
            </div>
          </div>
        ` : `
          <button class="btn btn-success btn-sm" onclick="checkItem(${item.id})">
            ☐ Alındı İşaretle
          </button>
        `}
      </div>
    </div>
  `;
}

// ⭐ KRİTİK: Item'ı işaretle
async function checkItem(itemId) {
    if (!confirm('Bu kalemi işaretlemek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}/check`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            // Sayfayı yeniden yükle
            loadJobDetail();
        } else {
            showAlert(data.error, 'error');
        }
    } catch (error) {
        console.error('Check item error:', error);
        showAlert('İşaretleme yapılamadı', 'error');
    }
}

// Modal aç/kapa
function openAddItemModal() {
    document.getElementById('addItemModal').classList.add('active');
    selectItemType('stock'); // Varsayılan olarak stoktan seçim
}

function closeAddItemModal() {
    document.getElementById('addItemModal').classList.remove('active');
    document.getElementById('addItemForm').reset();
    document.getElementById('selectedProductId').value = '';
    document.getElementById('productResults').innerHTML = '';
}

// Item tipi seç (stok / özel)
function selectItemType(type) {
    itemType = type;

    const stockBtn = document.getElementById('stockBtn');
    const customBtn = document.getElementById('customBtn');
    const stockSection = document.getElementById('stockSection');
    const customSection = document.getElementById('customSection');

    if (type === 'stock') {
        stockBtn.classList.remove('btn-outline');
        stockBtn.classList.add('btn-primary');
        customBtn.classList.remove('btn-primary');
        customBtn.classList.add('btn-outline');
        stockSection.style.display = 'block';
        customSection.style.display = 'none';
    } else {
        customBtn.classList.remove('btn-outline');
        customBtn.classList.add('btn-primary');
        stockBtn.classList.remove('btn-primary');
        stockBtn.classList.add('btn-outline');
        customSection.style.display = 'block';
        stockSection.style.display = 'none';
    }
}

// Ürün ara
let searchTimeout;
document.getElementById('productSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
        document.getElementById('productResults').innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            const products = await response.json();

            const resultsDiv = document.getElementById('productResults');

            if (products.length === 0) {
                resultsDiv.innerHTML = '<div class="no-results">Ürün bulunamadı</div>';
                return;
            }

            resultsDiv.innerHTML = '<div class="autocomplete-results">' +
                products.map(p => `
                    <div class="autocomplete-item" onclick="selectProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
                        <strong>${p.name}</strong>
                        ${p.barcode ? `<span>Barkod: ${p.barcode}</span>` : ''}
                        ${p.current_stock !== undefined ? `<span>Stok: ${p.current_stock}</span>` : ''}
                    </div>
                `).join('') +
                '</div>';

        } catch (error) {
            console.error('Product search error:', error);
        }
    }, 300);
});

// Ürün seç
function selectProduct(productId, productName) {
    document.getElementById('selectedProductId').value = productId;
    document.getElementById('productSearch').value = productName;
    document.getElementById('productResults').innerHTML = '';
}

// Kalem ekle form submit
document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const sourceId = document.getElementById('sourceSelect').value;
    const quantity = document.getElementById('quantity').value;

    let payload = {
        source_id: parseInt(sourceId),
        quantity: parseInt(quantity)
    };

    if (itemType === 'stock') {
        const productId = document.getElementById('selectedProductId').value;
        if (!productId) {
            showAlert('Lütfen bir ürün seçin', 'error');
            return;
        }
        payload.product_id = parseInt(productId);
    } else {
        const customName = document.getElementById('customName').value.trim();
        if (!customName) {
            showAlert('Lütfen özel isim girin', 'error');
            return;
        }
        payload.custom_name = customName;
    }

    try {
        const response = await fetch(`/api/jobs/${jobId}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Kalem başarıyla eklendi', 'success');
            closeAddItemModal();
            loadJobDetail();
        } else {
            showAlert(data.error, 'error');
        }
    } catch (error) {
        console.error('Add item error:', error);
        showAlert('Kalem eklenemedi', 'error');
    }
});

// ========================================
// TOPLU EKLEME FONKSİYONLARI
// ========================================

let allProducts = [];
let selectedBulkProducts = new Map(); // product_id -> quantity

async function openBulkAddModal() {
    document.getElementById('bulkAddModal').classList.add('active');

    // Kaynakları doldur
    const select = document.getElementById('bulkSourceSelect');
    select.innerHTML = '<option value="">Kaynak seçin...</option>';
    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.name;
        select.appendChild(option);
    });

    // Ürünleri yükle
    await loadAllProducts();
}

async function loadAllProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        renderBulkProductList(allProducts);
    } catch (error) {
        console.error('Products load error:', error);
        document.getElementById('bulkProductList').innerHTML =
            '<p class="text-center text-danger">Ürünler yüklenemedi</p>';
    }
}

function renderBulkProductList(products) {
    const container = document.getElementById('bulkProductList');

    if (products.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Ürün bulunamadı</p>';
        return;
    }

    container.innerHTML = products.map(p => {
        const isSelected = selectedBulkProducts.has(p.id);
        const quantity = isSelected ? selectedBulkProducts.get(p.id) : 1;

        return `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-bottom: 1px solid var(--gray-200);">
                <input type="checkbox" 
                    id="bulk_${p.id}" 
                    ${isSelected ? 'checked' : ''}
                    onchange="toggleBulkProduct(${p.id})"
                    style="width: 20px; height: 20px; cursor: pointer;">
                <label for="bulk_${p.id}" style="flex: 1; cursor: pointer; margin: 0;">
                    <strong>${p.name}</strong>
                    ${p.barcode ? `<span class="text-muted text-sm"> (${p.barcode})</span>` : ''}
                    ${p.current_stock !== undefined ? `<span class="text-sm"> - Stok: ${p.current_stock}</span>` : ''}
                </label>
                <input type="number" 
                    id="qty_${p.id}"
                    value="${quantity}" 
                    min="1" 
                    ${!isSelected ? 'disabled' : ''}
                    onchange="updateBulkQuantity(${p.id}, this.value)"
                    style="width: 80px; padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 4px;">
            </div>
        `;
    }).join('');

    updateBulkAddCount();
}

function toggleBulkProduct(productId) {
    const checkbox = document.getElementById(`bulk_${productId}`);
    const qtyInput = document.getElementById(`qty_${productId}`);

    if (checkbox.checked) {
        selectedBulkProducts.set(productId, parseInt(qtyInput.value) || 1);
        qtyInput.disabled = false;
    } else {
        selectedBulkProducts.delete(productId);
        qtyInput.disabled = true;
    }

    updateBulkAddCount();
}

function updateBulkQuantity(productId, quantity) {
    if (selectedBulkProducts.has(productId)) {
        selectedBulkProducts.set(productId, parseInt(quantity) || 1);
    }
}

function updateBulkAddCount() {
    const count = selectedBulkProducts.size;
    document.getElementById('bulkAddCount').textContent = `${count} ürün`;
}

// Toplu ekleme arama
document.getElementById('bulkSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
    );
    renderBulkProductList(filtered);
});

async function submitBulkAdd() {
    const sourceId = document.getElementById('bulkSourceSelect').value;

    if (!sourceId) {
        showAlert('Lütfen kaynak seçin', 'error');
        return;
    }

    if (selectedBulkProducts.size === 0) {
        showAlert('Lütfen en az bir ürün seçin', 'error');
        return;
    }

    const items = Array.from(selectedBulkProducts.entries()).map(([productId, quantity]) => ({
        product_id: productId,
        source_id: parseInt(sourceId),
        quantity: quantity
    }));

    try {
        // Toplu insert API endpoint'i
        for (const item of items) {
            await fetch(`/api/jobs/${jobId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }

        showAlert(`${items.length} ürün başarıyla eklendi!`, 'success');
        closeBulkAddModal();
        loadJobDetail();
    } catch (error) {
        console.error('Bulk add error:', error);
        showAlert('Toplu ekleme başarısız oldu', 'error');
    }
}

function closeBulkAddModal() {
    document.getElementById('bulkAddModal').classList.remove('active');
    selectedBulkProducts.clear();
    updateBulkAddCount();
}

// ========================================
// BARKOD TARAMA FONKSİYONLARI
// ========================================

let isScanning = false;
let scannedProductData = null;

async function openBarcodeScannerModal() {
    // Kamera desteği kontrolü
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showAlert('Kamera desteği bulunamadı', 'error');
        return;
    }

    document.getElementById('barcodeScannerModal').classList.add('active');
    document.getElementById('scanResult').style.display = 'none';
    document.getElementById('scanStatus').textContent = 'Kamera başlatılıyor...';

    // Kaynakları doldur
    const select = document.getElementById('scanSourceSelect');
    select.innerHTML = '';
    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.name;
        select.appendChild(option);
    });

    // Barkod tarayıcıyı başlat
    startBarcodeScanner();
}

function startBarcodeScanner() {
    isScanning = true;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // Arka kamera
            },
        },
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        },
    }, function (err) {
        if (err) {
            console.error('Quagga init error:', err);
            document.getElementById('scanStatus').textContent = 'Kamera başlatılamadı: ' + err.message;
            return;
        }
        Quagga.start();
        document.getElementById('scanStatus').textContent = 'Kamerayı ürün barkoduna doğrultun...';
    });

    Quagga.onDetected(onBarcodeDetected);
}

async function onBarcodeDetected(data) {
    if (!isScanning) return;

    const barcode = data.codeResult.code;
    console.log('Barkod bulundu:', barcode);

    // Taramayı durdur
    Quagga.stop();
    isScanning = false;

    // Ürünü ara
    try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(barcode)}`);
        const products = await response.json();

        if (products.length === 0) {
            document.getElementById('scanStatus').textContent = `❌ Barkod bulunamadı: ${barcode}`;
            setTimeout(() => startBarcodeScanner(), 2000);
            return;
        }

        // İlk eşleşen ürünü al
        scannedProductData = products[0];

        document.getElementById('scannedProduct').innerHTML = `
            <strong>${scannedProductData.name}</strong><br>
            <span class="text-sm">Barkod: ${scannedProductData.barcode}</span>
        `;
        document.getElementById('scanResult').style.display = 'block';
        document.getElementById('scanStatus').textContent = '✅ Barkod başarıyla okundu!';

    } catch (error) {
        console.error('Product lookup error:', error);
        document.getElementById('scanStatus').textContent = 'Ürün araması başarısız oldu';
        setTimeout(() => startBarcodeScanner(), 2000);
    }
}

async function addScannedProduct() {
    const sourceId = document.getElementById('scanSourceSelect').value;
    const quantity = document.getElementById('scanQuantity').value;

    if (!sourceId) {
        showAlert('Lütfen kaynak seçin', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/jobs/${jobId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: scannedProductData.id,
                source_id: parseInt(sourceId),
                quantity: parseInt(quantity)
            })
        });

        if (response.ok) {
            showAlert(`${scannedProductData.name} eklendi!`, 'success');
            loadJobDetail();

            // Taramaya devam et
            scannedProductData = null;
            document.getElementById('scanResult').style.display = 'none';
            document.getElementById('scanQuantity').value = 1;
            startBarcodeScanner();
        } else {
            showAlert('Ekleme başarısız oldu', 'error');
        }
    } catch (error) {
        console.error('Add scanned product error:', error);
        showAlert('Ekleme başarısız oldu', 'error');
    }
}

function closeBarcodeScanner() {
    if (isScanning && typeof Quagga !== 'undefined') {
        Quagga.stop();
    }
    isScanning = false;
    scannedProductData = null;
    document.getElementById('barcodeScannerModal').classList.remove('active');
}

// Sayfa yüklendiğinde
window.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadSources();
    loadJobDetail();
});
