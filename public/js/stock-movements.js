// Auth check
let currentUser = null;

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

// User info display and initialization
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (currentUser.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
    }

    await loadProducts();
    // await loadJobLists(); // REMOVED: Function does not exist and caused crash
    await loadMovements();
});

// FAILSAFE: Watchdog for Stock Movements
setTimeout(() => {
    const tbody = document.getElementById('movementList');
    if (tbody && tbody.innerHTML.includes('loader')) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">⚠️ Yanıt alınamadı (Watchdog). Lütfen sayfayı yenileyin.</td></tr>';
    }
}, 10000);

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

let products = [];

// Utility: Timeout wrapper for fetch
const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 8000 } = options;

    // CACHE BUSTING: Append timestamp
    let url = resource;
    if (url.includes('?')) {
        url += `&_t=${Date.now()}`;
    } else {
        url += `?_t=${Date.now()}`;
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            cache: 'no-store',
            headers: {
                ...options.headers,
                'Cache-Control': 'no-cache'
            }
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Load products
async function loadProducts() {
    try {
        console.log('📡 Fetching products...');
        const response = await fetchWithTimeout('/api/products');
        if (!response.ok) throw new Error('Sunucu hatası');

        products = await response.json();

        // Populate product selects
        const productOptions = products.map(p =>
            `<option value="${p.id}">${p.name} (Stok: ${p.current_stock})</option>`
        ).join('');

        document.getElementById('inProduct').innerHTML = '<option value="">Seçiniz...</option>' + productOptions;
        document.getElementById('outProduct').innerHTML = '<option value="">Seçiniz...</option>' + productOptions;
        document.getElementById('filterProduct').innerHTML = '<option value="">Tümü</option>' + productOptions;
        console.log('✅ Products loaded');
    } catch (error) {
        console.error('Ürün listesi hatası:', error);
        // Don't block UI mostly, but log it
    }
}

// Load movements
async function loadMovements() {
    const tbody = document.getElementById('movementList');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="loader"></div><br><small>Hareketler aranıyor...</small></td></tr>';

    try {
        const productId = document.getElementById('filterProduct').value;
        const type = document.getElementById('filterType').value;
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;

        let url = '/api/stock-movements?';
        if (productId) url += `product_id=${productId}&`;
        if (type) url += `type=${type}&`;
        if (startDate) url += `start_date=${startDate}&`;
        if (endDate) url += `end_date=${endDate}&`;

        console.log('📡 Fetching movements:', url);
        const response = await fetchWithTimeout(url);

        if (!response.ok) throw new Error(`Sunucu Hatası: ${response.status}`);

        const movements = await response.json();
        renderMovements(movements);
        console.log('✅ Movements loaded');
    } catch (error) {
        console.error('Hareket listesi hatası:', error);
        const msg = error.name === 'AbortError' ? 'Zaman aşımı (Sunucu yanıt vermedi)' : error.message;
        tbody.innerHTML =
            `<tr><td colspan="7" class="text-center text-danger">⚠️ Hata: ${msg} <br> <button class="btn btn-sm btn-outline-secondary mt-2" onclick="loadMovements()">Tekrar Dene</button></td></tr>`;
    }
}

// Render movements
function renderMovements(movements) {
    const tbody = document.getElementById('movementList');

    if (movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Kayıt bulunamadı</td></tr>';
        return;
    }

    tbody.innerHTML = movements.map(mov => {
        const typeInfo = getMovementTypeInfo(mov.movement_type);
        const person = mov.movement_type === 'IN' ? mov.brought_by :
            mov.movement_type === 'OUT' ? mov.taken_by : '-';
        const location = mov.movement_type === 'IN' ? mov.source_location :
            mov.movement_type === 'OUT' ? mov.destination : '-';

        return `
            <tr>
                <td>${formatDateTime(mov.created_at)}</td>
                <td>
                    <span class="badge ${typeInfo.class}">${typeInfo.icon} ${typeInfo.text}</span>
                </td>
                <td><strong>${mov.product.name}</strong></td>
                <td>${mov.quantity}</td>
                <td>${person || '-'}</td>
                <td>${location || '-'}</td>
                <td>${mov.reason || mov.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Clear filters
function clearFilters() {
    document.getElementById('filterProduct').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadMovements();
}

// Show modals
function showInModal() {
    document.getElementById('stockInForm').reset();
    document.getElementById('stockInModal').style.display = 'flex';
}

function showOutModal() {
    document.getElementById('stockOutForm').reset();
    document.getElementById('stockOutModal').style.display = 'flex';
}

function closeModals() {
    document.getElementById('stockInModal').style.display = 'none';
    document.getElementById('stockOutModal').style.display = 'none';
}

// Stock IN form submit
document.getElementById('stockInForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        product_id: document.getElementById('inProduct').value,
        quantity: document.getElementById('inQuantity').value,
        brought_by: document.getElementById('inBroughtBy').value,
        source_location: document.getElementById('inSource').value || null,
        notes: document.getElementById('inNotes').value || null
    };

    try {
        const response = await fetch('/api/stock-movements/in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kayıt başarısız');
        }

        alert('Stok giriş kaydı oluşturuldu');
        closeModals();
        loadMovements();
        loadProducts(); // Refresh stock quantities
    } catch (error) {
        console.error('Hata:', error);
        alert('Hata: ' + error.message);
    }
});

// Stock OUT form submit
document.getElementById('stockOutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        product_id: document.getElementById('outProduct').value,
        quantity: document.getElementById('outQuantity').value,
        taken_by: document.getElementById('outTakenBy').value,
        destination: document.getElementById('outDestination').value,
        reason: document.getElementById('outReason').value || null,
        notes: document.getElementById('outNotes').value || null
    };

    try {
        const response = await fetch('/api/stock-movements/out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kayıt başarısız');
        }

        alert('Stok çıkış kaydı oluşturuldu');
        closeModals();
        loadMovements();
        loadProducts(); // Refresh stock quantities
    } catch (error) {
        console.error('Hata:', error);
        alert('Hata: ' + error.message);
    }
});

// Helper functions
function getMovementTypeInfo(type) {
    const types = {
        'IN': { text: 'Giriş', icon: '📥', class: 'badge-success' },
        'OUT': { text: 'Çıkış', icon: '📤', class: 'badge-danger' },
        'ADJUSTMENT': { text: 'Düzenleme', icon: '⚙️', class: 'badge-warning' }
    };
    return types[type] || { text: type, icon: '', class: '' };
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Close modals on outside click
window.onclick = function (event) {
    if (event.target.id === 'stockInModal') {
        closeModals();
    }
    if (event.target.id === 'stockOutModal') {
        closeModals();
    }
}
