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
                resultsDiv.innerHTML = '<p class="text-muted text-sm">Ürün bulunamadı</p>';
                return;
            }

            resultsDiv.innerHTML = products.map(p => `
        <div class="card mb-1" style="cursor: pointer; padding: 0.75rem;" onclick="selectProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
          <strong>${p.name}</strong>
          ${p.barcode ? `<span class="text-sm text-muted">${p.barcode}</span>` : ''}
        </div>
      `).join('');

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

// Sayfa yüklendiğinde
window.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadSources();
    loadJobDetail();
});
