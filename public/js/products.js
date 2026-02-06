// Auth & State
let currentUser = null;
let products = [];

// Watchdog
setTimeout(() => {
    const tbody = document.getElementById('movementList');
    if (tbody && tbody.innerHTML.includes('loader') && document.getElementById('tab-movements').style.display !== 'none') {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">⚠️ Yanıt alınamadı (Watchdog). Lütfen sayfayı yenileyin.</td></tr>';
    }
}, 10000);

// Init
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    // Tabs
    setupTabs();

    // Load Data
    await loadProducts();
});

async function checkAuth() {
    const cachedUser = localStorage.getItem('user_cache');
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            updateUserInterface(user);
            currentUser = user;
        } catch (e) { console.error(e); }
    }

    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            localStorage.removeItem('user_cache');
            window.location.href = '/index.html';
            return null;
        }
        const user = await response.json();
        localStorage.setItem('user_cache', JSON.stringify(user));
        updateUserInterface(user);
        return user;
    } catch (error) {
        if (!cachedUser) window.location.href = '/index.html';
        return currentUser;
    }
}

function updateUserInterface(user) {
    if (!user) return;
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('userRole').textContent = user.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (user.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
        const addBtn = document.getElementById('addBtn');
        if (addBtn) addBtn.style.display = 'block';
    }
}

async function logout() {
    try {
        localStorage.removeItem('user_cache');
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // View Update
            const targetId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(targetId).style.display = 'block';

            // Data Load Trigger
            if (targetId === 'tab-movements') {
                loadMovements();
            }
        });
    });
}

// =======================
// PRODUCTS LOGIC
// =======================

async function loadProducts() {
    try {
        const response = await fetchWithTimeout('/api/products');
        if (!response.ok) throw new Error('Ürün verisi alınamadı');
        products = await response.json();

        renderProductList();
        renderProductDropdowns();
    } catch (error) {
        console.error('Ürün yükleme hatası:', error);
        document.getElementById('productsContainer').innerHTML =
            `<tr><td colspan="4" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
    }
}

function renderProductList() {
    const container = document.getElementById('productsContainer');
    if (!products || products.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Henüz ürün yok</td></tr>';
        return;
    }

    container.innerHTML = products.map(product => `
        <tr>
            <td><strong>${product.name}</strong></td>
            <td>${product.barcode || '-'}</td>
            <td>${currentUser && currentUser.role === 'admin' ? product.current_stock : '***'}</td>
            <td>${new Date(product.created_at).toLocaleDateString('tr-TR')}</td>
        </tr>
    `).join('');
}

function renderProductDropdowns() {
    const options = products.map(p =>
        `<option value="${p.id}">${p.name} (Stok: ${p.current_stock})</option>`
    ).join('');

    // Safely update if elements exist (Stock tabs content)
    const inEl = document.getElementById('inProduct');
    const outEl = document.getElementById('outProduct');
    const filterEl = document.getElementById('filterProduct');

    if (inEl) inEl.innerHTML = '<option value="">Seçiniz...</option>' + options;
    if (outEl) outEl.innerHTML = '<option value="">Seçiniz...</option>' + options;
    if (filterEl) filterEl.innerHTML = '<option value="">Tümü</option>' + options;
}

async function addProduct() {
    const name = prompt('Ürün adı:');
    if (!name) return;

    const barcode = prompt('Barkod (opsiyonel):') || null;
    const stock = parseInt(prompt('Başlangıç stok miktarı:', '0')) || 0;

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, barcode, current_stock: stock })
        });
        if (response.ok) {
            loadProducts(); // Reloads list and dropdowns
        } else {
            alert('Ürün eklenirken hata oluştu');
        }
    } catch (error) {
        console.error(error);
        alert('Hata: ' + error.message);
    }
}

// =======================
// STOCK MOVEMENTS LOGIC
// =======================

async function loadMovements() {
    const tbody = document.getElementById('movementList');
    if (!tbody) return; // Tab might not be effective yet

    // Simple Debounce/Check if already loading? No, simple is fine.
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="loader"></div></td></tr>';

    try {
        const productId = document.getElementById('filterProduct')?.value || '';
        const type = document.getElementById('filterType')?.value || '';
        const startDate = document.getElementById('filterStartDate')?.value || '';
        const endDate = document.getElementById('filterEndDate')?.value || '';

        let url = '/api/stock-movements?';
        if (productId) url += `product_id=${productId}&`;
        if (type) url += `type=${type}&`;
        if (startDate) url += `start_date=${startDate}&`;
        if (endDate) url += `end_date=${endDate}&`;

        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error('Veri alınamadı');

        const movements = await response.json();
        renderMovements(movements);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">⚠️ Hata: ${error.message}</td></tr>`;
    }
}

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
                <td><span class="badge ${typeInfo.class}">${typeInfo.icon} ${typeInfo.text}</span></td>
                <td><strong>${mov.product ? mov.product.name : 'Silinmiş Ürün'}</strong></td>
                <td>${mov.quantity}</td>
                <td>${person || '-'}</td>
                <td>${location || '-'}</td>
                <td>${mov.reason || mov.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

function clearFilters() {
    document.getElementById('filterProduct').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadMovements();
}

// =======================
// UTILS
// =======================

const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 8000 } = options;
    let url = resource;
    url += (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            cache: 'no-store',
            headers: { ...options.headers, 'Cache-Control': 'no-cache' }
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

function getMovementTypeInfo(type) {
    const types = {
        'IN': { text: 'Giriş', icon: '📥', class: 'badge-success' },
        'OUT': { text: 'Çıkış', icon: '📤', class: 'badge-danger' },
        'ADJUSTMENT': { text: 'Düzenleme', icon: '⚙️', class: 'badge-warning' }
    };
    return types[type] || { text: type, icon: '', class: '' };
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

// =======================
// MODALS
// =======================

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

// Listeners
document.getElementById('stockInForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleTransaction('/api/stock-movements/in', {
        product_id: document.getElementById('inProduct').value,
        quantity: document.getElementById('inQuantity').value,
        brought_by: document.getElementById('inBroughtBy').value,
        source_location: document.getElementById('inSource').value,
        notes: document.getElementById('inNotes').value
    });
});

document.getElementById('stockOutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleTransaction('/api/stock-movements/out', {
        product_id: document.getElementById('outProduct').value,
        quantity: document.getElementById('outQuantity').value,
        taken_by: document.getElementById('outTakenBy').value,
        destination: document.getElementById('outDestination').value,
        reason: document.getElementById('outReason').value,
        notes: document.getElementById('outNotes').value
    });
});

async function handleTransaction(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'İşlem başarısız');
        }

        alert('İşlem başarılı');
        closeModals();
        loadProducts(); // Update stocks
        if (document.getElementById('tab-movements').style.display !== 'none') {
            loadMovements(); // Update table if visible
        }
    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) closeModals();
}
