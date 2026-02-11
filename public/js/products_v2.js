// Auth & State
window.onerror = function (msg, url, line) {
    console.error('JS ERROR:', msg, 'Line:', line);
    // Use custom alert if available, fallback to native alert
    if (typeof showCustomAlert === 'function') {
        showCustomAlert('JavaScript Hatası', msg + ' (Satır: ' + line + ')', '❌', false);
    } else {
        alert('JS HATA: ' + msg + '\nSatır: ' + line);
    }
    return false;
};

// DEBUG: Confirm file load
console.log('✅ products_v2.js loaded v9.30 (Sepet Sistemi)');

let currentUser = null;
let products = [];

// Watchdog
setTimeout(() => {
    const tbody = document.getElementById('productsContainer');
    if (tbody && tbody.innerHTML.includes('loader')) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">⚠️ Yükleme zaman aşımı (10sn). Lütfen sayfayı yenileyin.</td></tr>';
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
    if (!products) return;
    const brands = [...new Set(products.map(p => p.brand).filter(b => b))].sort();
    const currentVal = brandFilter ? brandFilter.value : '';

    if (brandFilter) {
        // Filter dropdown
        brandFilter.innerHTML = '<option value="">Tüm Markalar</option>' +
            brands.map(b => `<option value="${b}">${b}</option>`).join('');

        if (brands.includes(currentVal)) brandFilter.value = currentVal;
    }

    // Autocomplete datalist for Add/Edit form
    const datalist = document.getElementById('brandOptions');
    if (datalist) {
        datalist.innerHTML = brands.map(b => `<option value="${b}">`).join('');
    }
}

function filterProducts() {
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    const brand = brandFilter ? brandFilter.value : '';

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
    console.log('DOM Ready');
    try {
        currentUser = await checkAuth();
        if (!currentUser) {
            console.log('No user, redirecting...');
            return;
        }

        // Tabs
        setupTabs();
        setupFilters();
        setupModalListeners();

        // Load Data
        await loadProducts();
    } catch (e) {
        alert('Init Hata: ' + e.message);
    }
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
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = user.full_name;

    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.textContent = user.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (user.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
        if (typeof addBtn !== 'undefined' && addBtn) addBtn.style.display = 'inline-block';
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
    console.log('Loading products...');
    const container = document.getElementById('productsContainer');
    try {
        // Direct fetch to avoid utilities issues
        const response = await fetch('/api/products?t=' + Date.now());

        if (!response.ok) throw new Error('Sunucudan veri alınamadı: ' + response.status);

        products = await response.json();
        console.log('Products loaded:', products.length);

        renderProductList();
        renderProductDropdowns();
        populateBrandFilter();
    } catch (error) {
        console.error('Ürün yükleme hatası:', error);
        if (container) {
            container.innerHTML =
                `<tr><td colspan="6" class="text-center text-danger">Hata: ${error.message} <br> <button class="btn btn-sm btn-outline-primary" onclick="loadProducts()">Tekrar Dene</button></td></tr>`;
        }
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

async function fetchWithTimeout(resource, options = {}) {
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
}

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
    document.getElementById('unifiedStockModal').style.display = 'none'; // ADDED
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
            .map(emp => `<option value="${emp.full_name}">`)
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
    const lower = trimmed.toLowerCase();

    // Try exact name match (case-sensitive first)
    let product = products.find(p => p.name === trimmed);

    // Try exact name match (case-insensitive)
    if (!product) {
        product = products.find(p => p.name.toLowerCase() === lower);
    }

    // Try barcode match
    if (!product) {
        product = products.find(p => p.barcode && (p.barcode.toLowerCase() === lower || p.barcode === trimmed));
    }

    // Try partial name match (starts with)
    if (!product) {
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

            // Check if returning to batch modal
            if (window.returnToBatchAfterCreate && !id) {
                // Only close add product modal
                document.getElementById('addProductModal').style.display = 'none';
                // Show batch modal (was hidden)
                document.getElementById('unifiedStockModal').style.display = 'flex';
                await loadProducts();
            } else {
                closeModals();
                await loadProducts();
            }

            // Select new product if returning to batch
            if (window.returnToBatchAfterCreate && !id) {
                window.returnToBatchAfterCreate = false;
                const productName = window.newProductNameToSelect;

                setTimeout(() => {
                    const newProduct = products.find(p => p.name === productName);
                    if (newProduct) {
                        selectBatchProduct(newProduct.id);
                    }
                }, 300);
            }
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
// Global submit functions for robust handling
// Global submit functions for robust handling
window.submitStockIn = async () => {
    console.log('Stock In Submit Triggered (Direct)');

    // Check if products loaded
    if (!products || products.length === 0) {
        alert('KRİTİK HATA: Ürün listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
        return;
    }

    const btn = document.querySelector('#stockInForm button.btn-success');
    if (btn) btn.disabled = true;

    try {
        const productInput = document.getElementById('inProduct').value;
        const productId = getProductIdFromInput(productInput);

        console.log(`Input: ${productInput}, ID: ${productId}`);

        if (!productId) {
            alert(`HATA: "${productInput}" adlı ürün sistemde bulunamadı.\nLütfen listeden seçtiğinize emin olun.`);
            if (btn) btn.disabled = false;
            return;
        }

        const quantity = document.getElementById('inQuantity').value;
        if (!quantity || quantity <= 0) {
            alert('Hata: Lütfen geçerli bir miktar girin.');
            if (btn) btn.disabled = false;
            return;
        }

        await handleTransaction('/api/stock-movements/in', {
            product_id: productId,
            quantity: quantity,
            brought_by: document.getElementById('inBroughtBy').value,
            source_location: document.getElementById('inSource').value,
            notes: document.getElementById('inNotes').value
        });
    } catch (e) {
        console.error(e);
        alert('BEKLENMEYEN HATA: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.submitStockOut = async () => {
    console.log('Stock Out Submit Triggered (Direct)');

    // 1. Check if products loaded
    if (!products || products.length === 0) {
        alert('KRİTİK HATA: Ürün listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
        return;
    }

    const btn = document.querySelector('#stockOutForm button.btn-danger');
    if (btn) btn.disabled = true;

    try {
        // 2. Product Validation
        const productInput = document.getElementById('outProduct').value;
        const productId = getProductIdFromInput(productInput);

        console.log(`Out Input: ${productInput}, ID: ${productId}`);

        if (!productId) {
            alert(`HATA: "${productInput}" adlı ürün sistemde bulunamadı.\nLütfen listeden seçtiğinize emin olun.`);
            if (btn) btn.disabled = false;
            return;
        }

        // 3. Quantity Validation
        const quantity = document.getElementById('outQuantity').value;
        if (!quantity || quantity <= 0) {
            alert('Hata: Lütfen geçerli bir miktar girin.');
            if (btn) btn.disabled = false;
            return;
        }

        // 4. Send Request
        await handleTransaction('/api/stock-movements/out', {
            product_id: productId,
            quantity: quantity,
            taken_by: document.getElementById('outTakenBy').value,
            destination: document.getElementById('outDestination').value,
            reason: document.getElementById('outReason').value,
            notes: document.getElementById('outNotes').value
        });

    } catch (e) {
        console.error(e);
        alert('BEKLENMEYEN HATA: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
};

async function handleTransaction(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            let errorDetails = '';
            try {
                const text = await response.text();
                errorDetails = text;
                const json = JSON.parse(text);
                if (json.error) {
                    throw new Error(json.error);
                }
            } catch (e) {
                // If parsing fails or custom error thrown
                if (e.message && e.message !== 'Unexpected token') {
                    throw e;
                }
            }
            throw new Error(`Sunucu Hatası (${response.status}): ${errorDetails.substring(0, 100)}`);
        }

        // Use custom alert with auto-close
        showCustomAlert('Başarılı!', 'İşlem kaydedildi.', '✅', true); // Auto-closes and closes modal
        loadProducts(); // Update stocks
        if (document.getElementById('tab-movements').style.display !== 'none') {
            loadMovements(); // Update table if visible
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showCustomAlert('Hata!', error.message, '❌', false);
    }
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) closeModals();
}

// --- UNIFIED MODAL LOGIC (ADDED v9.22) ---

let selectedUnifiedProduct = null;
let unifiedTransactionType = 'in'; // Default

window.openUnifiedModal = function () {
    // Reset State
    const searchInput = document.getElementById('unifiedSearchInput');
    const suggestions = document.getElementById('unifiedSuggestions');
    const actionSection = document.getElementById('unifiedActionSection');
    const createSection = document.getElementById('unifiedCreateSection');
    const formSection = document.getElementById('unifiedTransactionForm');
    const actionButtons = document.getElementById('actionButtons');

    if (searchInput) searchInput.value = '';
    if (suggestions) suggestions.innerHTML = '';
    if (actionSection) actionSection.style.display = 'none';
    if (createSection) createSection.style.display = 'none';
    if (formSection) formSection.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';

    document.getElementById('unifiedStockModal').style.display = 'flex'; // Changed to flex for centering
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 100);
}

window.handleUnifiedSearch = function (val) {
    const suggestions = document.getElementById('unifiedSuggestions');
    suggestions.innerHTML = '';

    document.getElementById('unifiedActionSection').style.display = 'none';
    document.getElementById('unifiedCreateSection').style.display = 'none';

    if (!val || val.length < 2) return;

    const lowerVal = val.toLocaleLowerCase('tr-TR');

    // Ensure products is loaded
    if (!products) {
        console.error('Products not loaded yet');
        return;
    }

    const matches = products.filter(p =>
        p.name.toLocaleLowerCase('tr-TR').includes(lowerVal) ||
        (p.barcode && p.barcode.includes(val))
    );

    if (matches.length === 0) {
        document.getElementById('unifiedCreateSection').style.display = 'block';
    } else {
        // Show suggestions
        matches.slice(0, 5).forEach(p => {
            const div = document.createElement('div');
            // Style suggestions
            div.style.padding = '10px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #eee';
            div.onmouseover = () => div.style.background = '#f0f9ff';
            div.onmouseout = () => div.style.background = 'white';

            div.innerHTML = `<strong>${p.name}</strong> <small style="color:#666">(${p.current_stock} ${p.unit || 'adet'})</small>`;
            div.onclick = () => selectUnifiedProduct(p);
            suggestions.appendChild(div);
        });
    }
}

window.selectUnifiedProduct = function (product) {
    selectedUnifiedProduct = product;

    // Fill Info
    document.getElementById('selectedProductName').textContent = product.name;
    document.getElementById('selectedProductStock').textContent = product.current_stock;
    document.getElementById('selectedProductUnit').textContent = capitalizeUnit(product.unit || 'adet');
    document.getElementById('selectedProductBrand').textContent = product.brand || '-';

    // Show Unit in Form
    document.getElementById('unifiedUnitLabel').textContent = capitalizeUnit(product.unit || 'adet');
    document.getElementById('unifiedProductId').value = product.id;

    // UI Updates
    document.getElementById('unifiedSearchInput').value = product.name;
    document.getElementById('unifiedSuggestions').innerHTML = '';
    document.getElementById('unifiedActionSection').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'flex';
    document.getElementById('unifiedTransactionForm').style.display = 'none';
}

window.setUnifiedMode = function (mode) {
    unifiedTransactionType = mode;
    document.getElementById('unifiedTransactionType').value = mode;
    document.getElementById('unifiedTransactionForm').style.display = 'block';

    // Toggle Fields
    if (mode === 'in') {
        document.getElementById('unifiedInFields').style.display = 'block';
        document.getElementById('unifiedOutFields').style.display = 'none';
        populateUnifiedDropdowns(); // Load employees and sources
    } else {
        document.getElementById('unifiedInFields').style.display = 'none';
        document.getElementById('unifiedOutFields').style.display = 'block';
        populateUnifiedDropdowns(); // Load employees
    }

    // Focus Quantity
    setTimeout(() => document.getElementById('unifiedQuantity').focus(), 100);
}

// Populate employee and source dropdowns
async function populateUnifiedDropdowns() {
    try {
        // Fetch employees
        const empResponse = await fetch('/api/employees');
        if (empResponse.ok) {
            const employees = await empResponse.json();
            const datalistIn = document.getElementById('unifiedEmployeeOptions');
            const datalistOut = document.getElementById('unifiedEmployeeOptionsOut');

            const empOptions = employees.map(emp => `<option value="${emp.full_name}">`).join('');
            if (datalistIn) datalistIn.innerHTML = empOptions;
            if (datalistOut) datalistOut.innerHTML = empOptions;
        }

        // Fetch sources (for IN only)
        const srcResponse = await fetch('/api/sources');
        if (srcResponse.ok) {
            const sources = await srcResponse.json();
            const datalistSrc = document.getElementById('unifiedSourceOptions');
            if (datalistSrc) {
                datalistSrc.innerHTML = sources.map(src => `<option value="${src.name}">`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading dropdowns:', error);
    }
}

window.submitUnifiedTransaction = async () => {
    const type = document.getElementById('unifiedTransactionType').value;
    const qty = document.getElementById('unifiedQuantity').value;
    const productId = document.getElementById('unifiedProductId').value;

    if (!qty || qty <= 0) {
        alert('Lütfen geçerli bir miktar girin.');
        return;
    }

    const endpoint = type === 'in' ? '/api/stock-movements/in' : '/api/stock-movements/out';

    // Build Base Body
    const body = {
        product_id: productId,
        quantity: qty,
        notes: document.getElementById('unifiedNotes').value
    };

    // Add specific fields
    if (type === 'in') {
        const employee = document.getElementById('unifiedEmployee').value;
        const source = document.getElementById('unifiedSourceIn').value;

        body.brought_by = employee;
        body.source_location = source;

        // Auto-create source if new
        if (source && source.trim()) {
            await ensureSourceExists(source.trim());
        }
    } else {
        const employee = document.getElementById('unifiedDestination').value; // Has datalist now
        const project = document.getElementById('unifiedReason').value; // Project field

        body.taken_by = employee;
        body.destination = project;
        body.reason = project;
    }

    await handleTransaction(endpoint, body);
}

// Ensure source exists, create if not
async function ensureSourceExists(sourceName) {
    try {
        const response = await fetch('/api/sources');
        if (response.ok) {
            const sources = await response.json();
            const exists = sources.some(s => s.name.toLowerCase() === sourceName.toLowerCase());

            if (!exists) {
                // Create new source
                const createResponse = await fetch('/api/sources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: sourceName })
                });

                if (createResponse.ok) {
                    console.log('New source created:', sourceName);
                    showToast('Yeni kaynak eklendi: ' + sourceName, 'success');
                }
            }
        }
    } catch (error) {
        console.error('Error checking/creating source:', error);
    }
}

window.switchToCreateMode = function () {
    const name = document.getElementById('unifiedSearchInput').value;
    closeModals();
    addProduct(); // FIX: Was showAddModal() which doesn't exist
    setTimeout(() => {
        const nameInput = document.getElementById('newProdName');
        if (nameInput) nameInput.value = name;
    }, 200);
}

function capitalizeUnit(unit) {
    if (!unit) return '';
    return unit.charAt(0).toUpperCase() + unit.slice(1);
}

// =======================
// BARCODE SCANNER
// =======================

let html5QrcodeScanner = null;
let isScannerActive = false;

window.toggleBarcodeScanner = function () {
    const container = document.getElementById('barcodeScannerContainer');
    const btn = document.getElementById('scannerToggleBtn');

    if (isScannerActive) {
        stopBarcodeScanner();
    } else {
        // Show container
        container.style.display = 'block';
        btn.style.background = '#ef4444'; // Red when active
        btn.textContent = '⏹️';

        // Start scanner
        startBarcodeScanner();
    }
}

function startBarcodeScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        alert('Barkod okuyucu kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.');
        return;
    }

    html5QrcodeScanner = new Html5Qrcode("barcodeReader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778
    };

    html5QrcodeScanner.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        onScanSuccess,
        onScanError
    ).then(() => {
        isScannerActive = true;
        console.log('Scanner started');
    }).catch(err => {
        console.error('Scanner start error:', err);
        alert('Kamera erişimi reddedildi veya kullanılamıyor.');
        stopBarcodeScanner();
    });
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('Barcode scanned:', decodedText);

    // Fill search input
    const searchInput = document.getElementById('unifiedSearchInput');
    if (searchInput) {
        searchInput.value = decodedText;
        handleUnifiedSearch(decodedText);
    }

    // Stop scanner
    stopBarcodeScanner();

    // Visual feedback
    showToast('Barkod okundu: ' + decodedText, 'success');
}

function onScanError(errorMessage) {
    // Ignore frequent scan errors (normal when no barcode in view)
    // console.log('Scan error:', errorMessage);
}

window.stopBarcodeScanner = function () {
    if (html5QrcodeScanner && isScannerActive) {
        html5QrcodeScanner.stop().then(() => {
            console.log('Scanner stopped');
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            isScannerActive = false;

            // Hide container
            const container = document.getElementById('barcodeScannerContainer');
            if (container) container.style.display = 'none';

            // Reset button
            const btn = document.getElementById('scannerToggleBtn');
            if (btn) {
                btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                btn.textContent = '📷';
            }
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
}

// =======================
// CUSTOM ALERT & CART FUNCTIONS
// =======================

// Custom Alert System
function showCustomAlert(title, message, icon = '✅', autoClose = true) {
    const overlay = document.getElementById('customAlertOverlay');
    const iconEl = document.getElementById('customAlertIcon');
    const titleEl = document.getElementById('customAlertTitle');
    const messageEl = document.getElementById('customAlertMessage');

    if (!overlay) {
        console.error('Custom alert overlay not found');
        alert(title + ': ' + message);
        return;
    }

    iconEl.textContent = icon;
    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.style.display = 'flex';

    if (autoClose) {
        setTimeout(() => {
            closeCustomAlert();
            closeModals(); // Close unified modal
        }, 1800);
    }
}

function closeCustomAlert() {
    const overlay = document.getElementById('customAlertOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Cart System
let cart = [];

window.addToCart = function () {
    const product = selectedUnifiedProduct;
    const type = document.getElementById('unifiedTransactionType').value;
    const qty = document.getElementById('unifiedQuantity').value;

    if (!product || !type || !qty || qty <= 0) {
        showCustomAlert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.', '⚠️', false);
        return;
    }

    // Build item data
    const item = {
        product: {
            id: product.id,
            name: product.name,
            unit: product.unit
        },
        type: type,
        quantity: parseInt(qty),
        notes: document.getElementById('unifiedNotes').value
    };

    // Add type-specific fields
    if (type === 'in') {
        item.brought_by = document.getElementById('unifiedEmployee').value;
        item.source_location = document.getElementById('unifiedSourceIn').value;
    } else {
        item.taken_by = document.getElementById('unifiedDestination').value;
        item.destination = document.getElementById('unifiedReason').value;
        item.reason = document.getElementById('unifiedReason').value;
    }

    cart.push(item);
    updateCartUI();
    showCustomAlert('Sepete Eklendi!', `${product.name} sepete eklendi. Toplam: ${cart.length} ürün`, '🛒', false);

    // Reset form for next item
    resetUnifiedForm();
}

function resetUnifiedForm() {
    // Clear search and hide sections
    document.getElementById('unifiedSearchInput').value = '';
    document.getElementById('unifiedSuggestions').innerHTML = '';
    document.getElementById('unifiedActionSection').style.display = 'none';
    document.getElementById('unifiedTransactionForm').style.display = 'none';
    document.getElementById('unifiedCreateSection').style.display = 'none';

    // Clear form fields
    document.getElementById('unifiedQuantity').value = '';
    document.getElementById('unifiedNotes').value = '';

    if (document.getElementById('unifiedEmployee')) document.getElementById('unifiedEmployee').value = '';
    if (document.getElementById('unifiedSourceIn')) document.getElementById('unifiedSourceIn').value = '';
    if (document.getElementById('unifiedDestination')) document.getElementById('unifiedDestination').value = '';
    if (document.getElementById('unifiedReason')) document.getElementById('unifiedReason').value = '';

    selectedUnifiedProduct = null;

    // Focus search for next item
    setTimeout(() => document.getElementById('unifiedSearchInput').focus(), 100);
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartBadge = document.getElementById('cartBadge');
    const cartCount = document.getElementById('cartCount');
    const cartBtn = document.getElementById('cartToggleBtn');

    cartBadge.textContent = cart.length;
    cartCount.textContent = `${cart.length} ürün`;

    if (cart.length > 0) {
        cartBtn.style.display = 'flex';
    } else {
        cartBtn.style.display = 'none';
    }

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">Sepet boş<br>🛒</p>';
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px; margin-bottom: 12px; background: ${item.type === 'in' ? '#f0fdf4' : '#fef2f2'};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <strong style="font-size: 1.05rem; color: #1f2937;">${item.product.name}</strong>
                    <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
                        ${item.type === 'in' ? '📥 Giriş' : '📤 Çıkış'} - <strong>${item.quantity}</strong> ${item.product.unit}
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.9rem;">🗑️</button>
            </div>
            ${item.type === 'in' ? `
                <div style="font-size: 0.85rem; color: #059669; margin-top: 8px; padding-top: 8px; border-top: 1px solid #d1fae5;">
                    ${item.brought_by ? `👤 ${item.brought_by}` : ''} ${item.source_location ? `• 📦 ${item.source_location}` : ''}
                </div>
            ` : `
                <div style="font-size: 0.85rem; color: #dc2626; margin-top: 8px; padding-top: 8px; border-top: 1px solid #fecaca;">
                    ${item.taken_by ? `👤 ${item.taken_by}` : ''} ${item.destination ? `• 🏗️ ${item.destination}` : ''}
                </div>
            `}
        </div>
    `).join('');
}

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    updateCartUI();
    showCustomAlert('Silindi', 'Ürün sepetten çıkarıldı.', '🗑️', true);
}

window.toggleCart = function (show) {
    const sidebar = document.getElementById('cartSidebar');
    if (show === true) {
        sidebar.style.right = '0px';
    } else if (show === false) {
        sidebar.style.right = '-420px';
    } else {
        // Toggle
        sidebar.style.right = (sidebar.style.right === '0px') ? '-420px' : '0px';
    }
}

window.clearCart = function () {
    if (cart.length === 0) return;

    if (confirm(`${cart.length} ürünü sepetten silmek istediğinize emin misiniz?`)) {
        cart = [];
        updateCartUI();
        toggleCart(false);
        showCustomAlert('Sepet Temizlendi', 'Tüm ürünler sepetten çıkarıldı.', '🗑️', true);
    }
}

window.processCart = async function () {
    if (cart.length === 0) {
        showCustomAlert('Sepet Boş', 'Sepette işlenecek ürün yok.', '⚠️', false);
        return;
    }

    const totalItems = cart.length;
    let successCount = 0;
    let failCount = 0;

    // Show processing alert
    showCustomAlert('İşleniyor...', `${totalItems} ürün kaydediliyor...`, '⏳', false);

    // Process each item
    for (const item of cart) {
        try {
            const endpoint = item.type === 'in' ? '/api/stock-movements/in' : '/api/stock-movements/out';

            const body = {
                product_id: item.product.id,
                quantity: item.quantity,
                notes: item.notes
            };

            // Add type-specific fields
            if (item.type === 'in') {
                body.brought_by = item.brought_by;
                body.source_location = item.source_location;

                // Auto-create source if needed
                if (item.source_location && item.source_location.trim()) {
                    await ensureSourceExists(item.source_location.trim());
                }
            } else {
                body.taken_by = item.taken_by;
                body.destination = item.destination;
                body.reason = item.reason;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                successCount++;
            } else {
                failCount++;
                console.error('Failed to process:', item.product.name);
            }
        } catch (error) {
            failCount++;
            console.error('Error processing:', item.product.name, error);
        }
    }

    // Clear cart and refresh
    cart = [];
    updateCartUI();
    toggleCart(false);
    await loadProducts();

    // Show result
    if (failCount === 0) {
        showCustomAlert('Tamamlandı! ✅', `${successCount} ürün başarıyla kaydedildi.`, '✅', true);
    } else {
        showCustomAlert('Kısmi Başarı', `${successCount} başarılı, ${failCount} başarısız.`, '⚠️', false);
    }
}

// =======================
// BATCH PROCESSING SYSTEM (Invoice Style)
// =======================

let batchItemsIn = [];  // Separate storage for IN mode
let batchItemsOut = []; // Separate storage for OUT mode
let batchItems = [];    // Active items (points to IN or OUT)
let batchMode = null;   // 'in' or 'out'
let selectedBatchProduct = null;

// Separate form data for each mode
let batchDataIn = { employee: '', source: '', notes: '' };
let batchDataOut = { employee: '', project: '', notes: '' };

// Open unified modal (now batch mode)
window.openUnifiedModal = function () {
    const modal = document.getElementById('unifiedStockModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    // FULL RESET
    resetBatchModal();
}

// Reset batch modal completely
function resetBatchModal() {
    // Clear ALL data (both modes)
    batchItemsIn = [];
    batchItemsOut = [];
    batchItems = [];
    batchMode = null;
    selectedBatchProduct = null;
    batchDataIn = { employee: '', source: '', notes: '' };
    batchDataOut = { employee: '', project: '', notes: '' };

    // Hide all sections except mode selection
    document.getElementById('batchCommonFields').style.display = 'none';
    document.getElementById('batchProductsSection').style.display = 'none';
    document.getElementById('batchAddSection').style.display = 'none';
    document.getElementById('batchSaveSection').style.display = 'none';

    // Reset buttons
    document.getElementById('batchModeIn').classList.remove('active');
    document.getElementById('batchModeOut').classList.remove('active');
    document.getElementById('batchModeIn').style.opacity = '1';
    document.getElementById('batchModeOut').style.opacity = '1';
    document.getElementById('batchModeIn').style.transform = 'scale(1)';
    document.getElementById('batchModeOut').style.transform = 'scale(1)';

    // Clear all inputs
    document.getElementById('batchProductSearch').value = '';
    document.getElementById('batchQuantity').value = '';
    document.getElementById('batchEmployee').value = '';
    document.getElementById('batchSource').value = '';
    document.getElementById('batchProject').value = '';
    document.getElementById('batchNotes').value = '';
    document.getElementById('batchProductSuggestions').innerHTML = '';
    document.getElementById('batchUnitLabel').textContent = '-';

    // Reset table
    updateBatchTable();
}

// Set batch mode (IN or OUT)
window.setBatchMode = async function (mode) {
    // Save current mode data before switching
    if (batchMode === 'in') {
        batchDataIn.employee = document.getElementById('batchEmployee').value;
        batchDataIn.source = document.getElementById('batchSource').value;
        batchDataIn.notes = document.getElementById('batchNotes').value;
        batchItemsIn = [...batchItems];
    } else if (batchMode === 'out') {
        batchDataOut.employee = document.getElementById('batchEmployee').value;
        batchDataOut.project = document.getElementById('batchProject').value;
        batchDataOut.notes = document.getElementById('batchNotes').value;
        batchItemsOut = [...batchItems];
    }

    // Switch mode
    batchMode = mode;

    // Load saved data for new mode
    if (mode === 'in') {
        batchItems = [...batchItemsIn];
        document.getElementById('batchEmployee').value = batchDataIn.employee;
        document.getElementById('batchSource').value = batchDataIn.source;
        document.getElementById('batchNotes').value = batchDataIn.notes;
    } else {
        batchItems = [...batchItemsOut];
        document.getElementById('batchEmployee').value = batchDataOut.employee;
        document.getElementById('batchProject').value = batchDataOut.project;
        document.getElementById('batchNotes').value = batchDataOut.notes;
    }

    // Update button styles
    const btnIn = document.getElementById('batchModeIn');
    const btnOut = document.getElementById('batchModeOut');

    if (mode === 'in') {
        btnIn.style.opacity = '1';
        btnIn.style.transform = 'scale(1.05)';
        btnOut.style.opacity = '0.5';
        btnOut.style.transform = 'scale(1)';

        // Show source field, hide project field
        document.getElementById('batchSourceField').style.display = 'block';
        document.getElementById('batchProjectField').style.display = 'none';
    } else {
        btnOut.style.opacity = '1';
        btnOut.style.transform = 'scale(1.05)';
        btnIn.style.opacity = '0.5';
        btnIn.style.transform = 'scale(1)';

        // Hide source field, show project field
        document.getElementById('batchSourceField').style.display = 'none';
        document.getElementById('batchProjectField').style.display = 'block';
    }

    // Show sections
    document.getElementById('batchCommonFields').style.display = 'block';
    document.getElementById('batchProductsSection').style.display = 'block';
    document.getElementById('batchAddSection').style.display = 'block';
    document.getElementById('batchSaveSection').style.display = 'block';

    // Load dropdowns
    await populateBatchDropdowns();

    // Focus on product search
    setTimeout(() => document.getElementById('batchProductSearch').focus(), 100);
}

// Populate employee and source dropdowns
async function populateBatchDropdowns() {
    try {
        // Fetch employees
        const empResponse = await fetch('/api/employees');
        if (empResponse.ok) {
            const employees = await empResponse.json();
            const datalist = document.getElementById('batchEmployeeOptions');
            const empOptions = employees.map(emp => `<option value="${emp.full_name}">`).join('');
            if (datalist) datalist.innerHTML = empOptions;
        }

        // Fetch sources (for IN only)
        if (batchMode === 'in') {
            const srcResponse = await fetch('/api/sources');
            if (srcResponse.ok) {
                const sources = await srcResponse.json();
                const datalist = document.getElementById('batchSourceOptions');
                if (datalist) {
                    datalist.innerHTML = sources.map(src => `<option value="${src.name}">`).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading dropdowns:', error);
    }
}

// Handle product search for batch
window.handleBatchProductSearch = function (query) {
    const suggestionsDiv = document.getElementById('batchProductSuggestions');

    if (!query || query.length < 1) {
        suggestionsDiv.innerHTML = '';
        return;
    }

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.barcode && p.barcode.includes(query))
    );

    if (filtered.length === 0) {
        // Show "Create New Product" option
        suggestionsDiv.innerHTML = `
            <div style="padding: 15px; text-align: center; border: 2px dashed #3b82f6; border-radius: 8px; background: #f0f9ff; margin-top: 8px;">
                <div style="color: #6b7280; margin-bottom: 8px;">"${query}" bulunamadı</div>
                <button onclick="createNewProductFromBatch('${query.replace(/'/g, "\\'")}')"
                    style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    ➕ Yeni Ürün Olarak Ekle
                </button>
            </div>
        `;
        return;
    }

    suggestionsDiv.innerHTML = filtered.slice(0, 8).map(p => `
        <div class="autocomplete-item" onclick="selectBatchProduct(${p.id})">
            <strong>${p.name}</strong>
            <div style="font-size: 0.85rem; color: #6b7280;">
                Stok: ${p.quantity} ${p.unit} • Marka: ${p.brand || '-'}
            </div>
        </div>
    `).join('');
}

// Select product for batch
window.selectBatchProduct = function (productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    selectedBatchProduct = product;

    // Update UI
    document.getElementById('batchProductSearch').value = product.name;
    document.getElementById('batchProductSuggestions').innerHTML = '';

    // Show stock info for admin, just unit for regular users
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner');
    if (isAdmin) {
        document.getElementById('batchUnitLabel').textContent = `${product.unit} (Stok: ${product.quantity})`;
    } else {
        document.getElementById('batchUnitLabel').textContent = product.unit;
    }

    // Focus quantity
    setTimeout(() => document.getElementById('batchQuantity').focus(), 100);
}

// Add product to batch
window.addProductToBatch = function () {
    if (!selectedBatchProduct) {
        showCustomAlert('Ürün Seçilmedi', 'Lütfen önce bir ürün seçin.', '⚠️', false);
        return;
    }

    const qty = parseInt(document.getElementById('batchQuantity').value);
    if (!qty || qty <= 0) {
        showCustomAlert('Geçersiz Miktar', 'Lütfen geçerli bir miktar girin.', '⚠️', false);
        return;
    }

    // Stock validation for OUT mode
    if (batchMode === 'out') {
        const currentStock = selectedBatchProduct.quantity || 0;
        if (qty > currentStock) {
            showCustomAlert('Yetersiz Stok', `Stokta sadece ${currentStock} ${selectedBatchProduct.unit} var. Daha fazla çıkış yapamazsınız.`, '⚠️', false);
            return;
        }
    }

    // Add to batch
    batchItems.push({
        product: {
            id: selectedBatchProduct.id,
            name: selectedBatchProduct.name,
            unit: selectedBatchProduct.unit,
            currentStock: selectedBatchProduct.quantity
        },
        quantity: qty
    });

    // Update table
    updateBatchTable();

    // Reset product selection
    document.getElementById('batchProductSearch').value = '';
    document.getElementById('batchQuantity').value = '';
    document.getElementById('batchUnitLabel').textContent = '-';
    selectedBatchProduct = null;

    // Focus search for next product
    setTimeout(() => document.getElementById('batchProductSearch').focus(), 100);
}

// Update batch products table
function updateBatchTable() {
    const tbody = document.getElementById('batchProductsTable');
    const countSpan = document.getElementById('batchCount');
    const saveCountSpan = document.getElementById('batchSaveCount');

    countSpan.textContent = batchItems.length;
    saveCountSpan.textContent = batchItems.length;

    if (batchItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 40px; text-align: center; color: #9ca3af;">
                    Henüz ürün eklenmedi
                </td>
            </tr>
        `;
        return;
    }

    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner');

    tbody.innerHTML = batchItems.map((item, index) => `
        <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px;">
                <strong style="color: #1f2937;">${item.product.name}</strong>
                ${isAdmin ? `<div style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">Stok: ${item.product.currentStock} ${item.product.unit}</div>` : ''}
            </td>
            <td style="padding: 12px; text-align: center;">
                <input type="number" 
                    value="${item.quantity}" 
                    onchange="updateBatchQuantity(${index}, this.value)"
                    style="width: 80px; padding: 6px; text-align: center; border: 1px solid #d1d5db; border-radius: 4px; font-weight: 600; color: #3b82f6;"
                    min="1"
                    ${batchMode === 'out' ? `max="${item.product.currentStock}"` : ''}>
            </td>
            <td style="padding: 12px; text-align: center; color: #6b7280;">
                ${item.product.unit}
            </td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="removeFromBatch(${index})" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-size: 0.9rem;">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Update quantity for a specific batch item
window.updateBatchQuantity = function (index, newQuantity) {
    const qty = parseInt(newQuantity);
    if (qty && qty > 0) {
        batchItems[index].quantity = qty;
        // Update save count
        document.getElementById('batchSaveCount').textContent = batchItems.length;
    } else {
        // Reset to previous value if invalid
        updateBatchTable();
    }
}

// Remove item from batch
window.removeFromBatch = function (index) {
    batchItems.splice(index, 1);
    updateBatchTable();
}

// Create new product from batch search
window.createNewProductFromBatch = function (productName) {
    // Store current batch state
    const currentMode = batchMode;

    // Set flag to return to batch after product creation
    window.returnToBatchAfterCreate = true;
    window.batchModeToRestore = currentMode;
    window.newProductNameToSelect = productName;

    // Don't close batch modal, just hide it temporarily
    document.getElementById('unifiedStockModal').style.display = 'none';
    // Open add product modal with pre-filled name
    setTimeout(() => {
        addProduct();
        setTimeout(() => {
            const nameInput = document.getElementById('newProdName');
            if (nameInput) nameInput.value = productName;
        }, 100);
    }, 100);
}

// Submit batch
window.submitBatch = async function () {
    if (batchItems.length === 0) {
        showCustomAlert('Sepet Boş', 'Lütfen önce ürün ekleyin.', '⚠️', false);
        return;
    }

    // Get common fields
    const employee = document.getElementById('batchEmployee').value;
    if (!employee || !employee.trim()) {
        showCustomAlert('Personel Seçilmedi', 'Lütfen personel seçin.', '⚠️', false);
        return;
    }

    let source = '';
    let project = '';

    if (batchMode === 'in') {
        source = document.getElementById('batchSource').value;
        if (!source || !source.trim()) {
            showCustomAlert('Kaynak Seçilmedi', 'Lütfen kaynak seçin.', '⚠️', false);
            return;
        }
    } else {
        project = document.getElementById('batchProject').value;
        if (!project || !project.trim()) {
            showCustomAlert('Proje Girilmedi', 'Lütfen proje adı girin.', '⚠️', false);
            return;
        }
    }

    const notes = document.getElementById('batchNotes').value;

    // Show processing
    showCustomAlert('İşleniyor...', `${batchItems.length} ürün kaydediliyor...`, '⏳', false);

    let successCount = 0;
    let failCount = 0;

    // Process each item
    for (const item of batchItems) {
        try {
            const endpoint = batchMode === 'in' ? '/api/stock-movements/in' : '/api/stock-movements/out';

            const body = {
                product_id: item.product.id,
                quantity: item.quantity,
                notes: notes
            };

            if (batchMode === 'in') {
                body.brought_by = employee;
                body.source_location = source;

                // Auto-create source if needed
                if (source && source.trim()) {
                    await ensureSourceExists(source.trim());
                }
            } else {
                body.taken_by = employee;
                body.destination = project;
                body.reason = project;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                successCount++;
            } else {
                failCount++;
                console.error('Failed to process:', item.product.name);
            }
        } catch (error) {
            failCount++;
            console.error('Error processing:', item.product.name, error);
        }
    }

    // Refresh products
    await loadProducts();

    // Show result
    if (failCount === 0) {
        showCustomAlert('Tamamlandı! ✅', `${successCount} ürün başarıyla kaydedildi.`, '✅', true);
        // Reset will happen via auto-close
    } else {
        showCustomAlert('Kısmi Başarı', `${successCount} başarılı, ${failCount} başarısız.`, '⚠️', false);
    }
}
