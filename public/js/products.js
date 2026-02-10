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

// Search & Filter Logic
let searchTimeout;
const searchInput = document.getElementById('productSearch');
const brandFilter = document.getElementById('brandFilter');

function setupFilters() {
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterProducts, 300);
    });
    brandFilter?.addEventListener('change', filterProducts);
}

function populateBrandFilter() {
    const brands = [...new Set(products.map(p => p.brand).filter(b => b))].sort();
    const currentVal = brandFilter.value;

    // Filter dropdown
    brandFilter.innerHTML = '<option value="">Tüm Markalar</option>' +
        brands.map(b => `<option value="${b}">${b}</option>`).join('');

    if (brands.includes(currentVal)) brandFilter.value = currentVal;

    // Autocomplete datalist for Add/Edit form
    const datalist = document.getElementById('brandOptions');
    if (datalist) {
        datalist.innerHTML = brands.map(b => `<option value="${b}">`).join('');
    }
}

function filterProducts() {
    const query = searchInput.value.toLowerCase().trim();
    const brand = brandFilter.value;

    const filtered = products.filter(p => {
        const matchesQuery = !query ||
            p.name.toLowerCase().includes(query) ||
            (p.barcode && p.barcode.toLowerCase().includes(query));

        const matchesBrand = !brand || (p.brand === brand);

        return matchesQuery && matchesBrand;
    });

    renderProductList(filtered);
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    // Tabs
    setupTabs();
    setupFilters();
    setupModalListeners(); // Ensure listeners are attached

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
        if (addBtn) addBtn.style.display = 'inline-block';
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
        populateBrandFilter();
    } catch (error) {
        console.error('Ürün yükleme hatası:', error);
        document.getElementById('productsContainer').innerHTML =
            `<tr><td colspan="6" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
    }
}

function renderProductList(listToRender = products) {
    const container = document.getElementById('productsContainer');
    if (!listToRender || listToRender.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Ürün bulunamadı</td></tr>';
        return;
    }

    container.innerHTML = listToRender.map(product => {
        const unit = product.unit ? product.unit.charAt(0).toUpperCase() + product.unit.slice(1).toLowerCase() : '-';
        return `
        <tr onclick="editProduct(${product.id})" style="cursor: pointer;">
            <td><strong style="color: var(--primary-color); text-decoration: underline;">${product.name}</strong></td>
            <td>${product.barcode || '-'}</td>
            <td>${product.brand || '-'}</td>
            <td>${currentUser && currentUser.role === 'admin' ? product.current_stock : '***'}</td>
            <td>${unit}</td>
            <td>${new Date(product.created_at).toLocaleDateString('tr-TR')}</td>
        </tr>
    `;
    }).join('');
}

function renderProductDropdowns() {
    const options = products.map(p =>
        `<option value="${p.id}">${p.name} (Stok: ${p.current_stock} ${p.unit || ''})</option>`
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
    document.getElementById('addProductForm').reset();
    document.getElementById('editProdId').value = ''; // Clear ID
    document.getElementById('newProdName').value = '';
    document.getElementById('newProdBarcode').value = '';
    document.getElementById('newProdBrand').value = '';
    document.getElementById('newProdStock').value = ''; // Empty by default
    document.getElementById('newProdUnit').value = 'adet';

    document.getElementById('productModalTitle').textContent = '✨ Yeni Ürün Ekle';

    // Hide delete button & history
    const btnDelete = document.getElementById('btnDeleteProduct');
    if (btnDelete) btnDelete.style.display = 'none';

    const historyDiv = document.getElementById('modalProductHistory');
    if (historyDiv) historyDiv.style.display = 'none';

    document.getElementById('addProductModal').style.display = 'flex';
}

// Logic handled by event listener below

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
    populateProductAutocomplete();
    populateEmployeeAutocomplete();
    populateSourceAutocomplete();
    document.getElementById('stockInModal').style.display = 'flex';
}

function showOutModal() {
    document.getElementById('stockOutForm').reset();
    populateProductAutocomplete(); // Reuse for stock out too
    populateEmployeeAutocomplete();
    document.getElementById('stockOutModal').style.display = 'flex';
}

function closeModals() {
    document.getElementById('stockInModal').style.display = 'none';
    document.getElementById('stockOutModal').style.display = 'none';
    document.getElementById('addProductModal').style.display = 'none';
}

// Event Listeners for Stock Buttons (More robust than onclick)
function setupModalListeners() {
    console.log('Setting up modal listeners...');

    const btnIn = document.getElementById('btnStockIn');
    const btnOut = document.getElementById('btnStockOut');
    const btnAdd = document.getElementById('addBtn');

    if (btnIn) {
        btnIn.onclick = showInModal; // Direct assignment is safer than addEventListener for single handlers
        console.log('Stock In button connected');
    } else console.error('Stock In button not found');

    if (btnOut) {
        btnOut.onclick = showOutModal;
        console.log('Stock Out button connected');
    } else console.error('Stock Out button not found');

    if (btnAdd) {
        btnAdd.onclick = addProduct;
        console.log('Add Product button connected');
    }
}

// Call this on load
document.addEventListener('DOMContentLoaded', setupModalListeners);

// Also expose to global scope just in case (e.g. edit/delete still need it)
window.showInModal = showInModal;
window.showOutModal = showOutModal;
window.closeModals = closeModals;
window.addProduct = addProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.logout = logout;

// =======================
// AUTOCOMPLETE HELPERS
// =======================

function populateProductAutocomplete() {
    const datalist = document.getElementById('productOptions');
    if (!datalist) return;

    // Show ALL products (don't filter by stock)
    datalist.innerHTML = products
        .map(p => {
            const label = `${p.name}${p.barcode ? ' (' + p.barcode + ')' : ''} - Stok: ${p.stock} ${capitalizeUnit(p.unit)}`;
            return `<option value="${p.name}">${label}</option>`;
        })
        .join('');
}

async function populateEmployeeAutocomplete() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) return;

        const employees = await response.json();
        const datalist = document.getElementById('employeeOptions');
        if (!datalist) return;

        datalist.innerHTML = employees
            .map(emp => `<option value="${emp.name}">`)
            .join('');
    } catch (error) {
        console.error('Employee autocomplete failed:', error);
    }
}

async function populateSourceAutocomplete() {
    try {
        const response = await fetch('/api/sources');
        if (!response.ok) return;

        const sources = await response.json();
        const datalist = document.getElementById('sourceOptions');
        if (!datalist) return;

        datalist.innerHTML = sources
            .map(src => `<option value="${src.name}">`)
            .join('');
    } catch (error) {
        console.error('Source autocomplete failed:', error);
    }
}

// Helper: Find product ID from autocomplete input (by name or barcode)
function getProductIdFromInput(inputValue) {
    if (!inputValue) return null;

    const trimmed = inputValue.trim();

    // Try exact name match (case-sensitive first)
    let product = products.find(p => p.name === trimmed);

    // Try exact name match (case-insensitive)
    if (!product) {
        const lower = trimmed.toLowerCase();
        product = products.find(p => p.name.toLowerCase() === lower);
    }

    // Try barcode match
    if (!product) {
        product = products.find(p => p.barcode && p.barcode.toLowerCase() === lower || p.barcode === trimmed);
    }

    // Try partial name match (starts with)
    if (!product) {
        const lower = trimmed.toLowerCase();
        product = products.find(p => p.name.toLowerCase().startsWith(lower));
    }

    return product ? product.id : null;
}

// Listeners
// Listeners
document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editProdId').value;
    const name = document.getElementById('newProdName').value;
    const barcode = document.getElementById('newProdBarcode').value || null;
    const brand = document.getElementById('newProdBrand').value || null;
    const stock = parseInt(document.getElementById('newProdStock').value) || 0;
    const unit = document.getElementById('newProdUnit').value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, barcode, brand, stock, unit })
        });

        if (response.ok) {
            showToast(id ? 'Ürün başarıyla güncellendi' : 'Ürün başarıyla eklendi', 'success');
            closeModals();
            loadProducts();
        } else {
            const err = await response.json();
            showToast('Hata: ' + (err.error || 'İşlem başarısız'), 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Hata: ' + error.message, 'error');
    }
});

async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('addProductForm').reset();
    document.getElementById('DataProductTitle') ? document.getElementById('DataProductTitle').textContent = 'Ürün Düzenle' : null;
    document.getElementById('productModalTitle').textContent = 'Ürün Düzenle';

    document.getElementById('editProdId').value = product.id;
    document.getElementById('newProdName').value = product.name;
    document.getElementById('newProdBarcode').value = product.barcode || '';
    document.getElementById('newProdStock').value = product.current_stock;

    // Show delete button
    const btnDelete = document.getElementById('btnDeleteProduct');
    if (btnDelete) btnDelete.style.display = 'block';

    // Show & Load History
    const historyDiv = document.getElementById('modalProductHistory');
    const historyBody = document.getElementById('modalHistoryBody');

    if (historyDiv && historyBody) {
        historyDiv.style.display = 'block';
        historyBody.innerHTML = '<tr><td colspan="4" class="text-center">Yükleniyor...</td></tr>';

        try {
            // Fetch last 5 movements
            const res = await fetchWithTimeout(`/api/stock-movements?product_id=${id}&limit=5`);
            if (res.ok) {
                const moves = await res.json();
                if (moves.length > 0) {
                    historyBody.innerHTML = moves.map(m => {
                        const typeInfo = getMovementTypeInfo(m.movement_type);
                        const person = m.movement_type === 'IN' ? m.brought_by : (m.taken_by || '-');
                        return `
                            <tr>
                                <td>${new Date(m.created_at).toLocaleDateString('tr-TR')}</td>
                                <td><span class="badge ${typeInfo.class}" style="font-size:0.75rem; padding: 2px 6px;">${typeInfo.text}</span></td>
                                <td>${m.quantity}</td>
                                <td>${person}</td>
                            </tr>
                         `;
                    }).join('');
                } else {
                    historyBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Hareket yok</td></tr>';
                }
            } else {
                historyBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Yüklenemedi</td></tr>';
            }
        } catch (e) {
            console.error(e);
            historyBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Hata</td></tr>';
        }
    }

    document.getElementById('addProductModal').style.display = 'flex';
}

async function deleteProduct() {
    const id = document.getElementById('editProdId').value;
    if (!id) return;

    if (!confirm('Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Ürün silindi');
            closeModals();
            loadProducts();
        } else {
            const err = await response.json();
            alert('Hata: ' + (err.error || 'Silme işlemi başarısız'));
        }
    } catch (error) {
        console.error(error);
        alert('Hata: ' + error.message);
    }
}
function setupFormListeners() {
    console.log('Setting up form listeners...');

    const inForm = document.getElementById('stockInForm');
    if (inForm) {
        // Remove existing listeners by cloning (optional but safe)
        // inForm.replaceWith(inForm.cloneNode(true)); 
        // Better: just add unique listener
        inForm.onsubmit = async (e) => {
            e.preventDefault();
            console.log('Stock In Submit Triggered');

            const productInput = document.getElementById('inProduct').value;
            const productId = getProductIdFromInput(productInput);

            if (!productId) {
                showToast('Lütfen geçerli bir ürün seçin', 'error');
                return;
            }

            await handleTransaction('/api/stock-movements/in', {
                product_id: productId,
                quantity: document.getElementById('inQuantity').value,
                brought_by: document.getElementById('inBroughtBy').value,
                source_location: document.getElementById('inSource').value,
                notes: document.getElementById('inNotes').value
            });
        };
        console.log('Stock In Form Listener Attached');
    } else console.error('Stock In Form not found');

    const outForm = document.getElementById('stockOutForm');
    if (outForm) {
        outForm.onsubmit = async (e) => {
            e.preventDefault();
            console.log('Stock Out Submit Triggered');

            const productInput = document.getElementById('outProduct').value;
            const productId = getProductIdFromInput(productInput);

            if (!productId) {
                showToast('Lütfen geçerli bir ürün seçin', 'error');
                return;
            }

            await handleTransaction('/api/stock-movements/out', {
                product_id: productId,
                quantity: document.getElementById('outQuantity').value,
                taken_by: document.getElementById('outTakenBy').value,
                destination: document.getElementById('outDestination').value,
                reason: document.getElementById('outReason').value,
                notes: document.getElementById('outNotes').value
            });
        };
        console.log('Stock Out Form Listener Attached');
    } else console.error('Stock Out Form not found');
}

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

        showToast('İşlem başarıyla tamamlandı!', 'success');
        closeModals();
        loadProducts(); // Update stocks
        if (document.getElementById('tab-movements').style.display !== 'none') {
            loadMovements(); // Update table if visible
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) closeModals();
}
