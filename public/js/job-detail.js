// Global değişkenler
let jobId = null;
let currentUser = null;
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

// Kaynakları yükle (hem inline hem edit modal için)
async function loadSources() {
    try {
        const response = await fetch('/api/sources');
        sources = await response.json();

        // Inline form source select
        const inlineSelect = document.getElementById('inlineSourceSelect');
        if (inlineSelect) {
            inlineSelect.innerHTML = '<option value="">Kaynak seçin...</option>';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source.id;
                option.textContent = source.name;
                inlineSelect.appendChild(option);
            });
        }

        // Edit modal source select
        const editSelect = document.getElementById('editSource');
        if (editSelect) {
            editSelect.innerHTML = '<option value="">Kaynak seçin...</option>';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source.id;
                option.textContent = source.name;
                editSelect.appendChild(option);
            });
        }

        // Autocomplete datalist (kaynak input için)
        const sourceList = document.getElementById('sourceList');
        if (sourceList) {
            sourceList.innerHTML = '';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source.name;
                sourceList.appendChild(option);
            });
        }
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

        const job = await response.json();

        // Başlığı güncelle
        document.getElementById('jobTitle').textContent = job.title;

        // COMPLETION % + VIEWERS göster
        renderCompletionStats(job.completion, job.viewers);

        // Kalemleri render et
        renderItems(job.items || []);

        // TAMAMLANMAYAN MALZEMELER
        renderIncompleteItems(job.items || []);

        // SİLİNEN ÜRÜNLER
        renderDeletions(job.deletions || []);

        // View tracking kaydet (silent)
        trackView();

    } catch (error) {
        console.error('Job detail load error:', error);
        showAlert('İş listesi yüklenemedi');
    }
}

// View tracking (kim baktı log'u)
async function trackView() {
    try {
        await fetch(`/api/jobs/${jobId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        // Silent fail - tracking is not critical
    }
}

// Completion stats render
function renderCompletionStats(completion, viewers) {
    const container = document.getElementById('completionStats');
    if (!container) return;

    const percentage = completion?.percentage || 0;
    const total = completion?.total || 0;
    const completed = completion?.completed || 0;

    let viewersHtml = '';
    if (viewers && viewers.length > 0) {
        const uniqueViewers = [...new Map(viewers.map(v => [v.user?.id, v])).values()];
        viewersHtml = uniqueViewers.slice(0, 3).map(v =>
            `${v.user?.full_name || 'Bilinmiyor'}`
        ).join(', ');
        if (uniqueViewers.length > 3) {
            viewersHtml += ` +${uniqueViewers.length - 3} diğer`;
        }
    }

    container.innerHTML = `
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <strong>Tamamlanma:</strong> ${completed}/${total} (%${percentage})
                    <div style="background: #e5e7eb; height: 8px; width: 200px; border-radius: 4px; margin-top: 5px; overflow: hidden;">
                        <div style="background: #059669; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                    </div>
                </div>
                ${viewers && viewers.length > 0 ? `
                    <div style="font-size: 0.9rem; color: #6b7280;">
                        <strong>Görüntüleyenler:</strong> ${viewersHtml}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Tamamlanmayan malzemeler
function renderIncompleteItems(items) {
    const container = document.getElementById('incompleteItems');
    if (!container) return;

    const incomplete = items.filter(item => !item.is_checked && item.quantity_missing > 0);

    if (incomplete.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; font-size: 1rem; color: #92400e;">⚠️ Tamamlanmayan Malzemeler</h3>
            ${incomplete.map(item => {
        const productName = item.product ? item.product.name : item.custom_name;
        return `
                    <div style="padding: 8px 0; border-bottom: 1px solid #fde68a;">
                        <strong>${productName}</strong><br>
                        <span style="font-size: 0.9rem; color: #92400e;">
                            Toplam: ${item.quantity} | Bulundu: ${item.quantity_found || 0} | Eksik: ${item.quantity_missing}
                            ${item.missing_source ? ` → ${item.missing_source}'tan alınacak` : ''}
                        </span>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

// Silinen ürünler
function renderDeletions(deletions) {
    const container = document.getElementById('deletedItems');
    if (!container) return;

    if (deletions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <details style="margin-top: 20px; padding: 10px; background: #fee2e2; border-radius: 8px; cursor: pointer;">
            <summary style="font-weight: 600; color: #991b1b; font-size: 0.9rem;">
                🗑️ Silinen Ürünler (${deletions.length})
            </summary>
            <div style="margin-top: 10px;">
                ${deletions.map(d => `
                    <div style="padding: 8px; margin-top: 5px; background: white; border-radius: 4px; font-size: 0.85rem;">
                        <strong>${d.product_name}</strong> - ${d.quantity} adet
                        ${d.source_name ? `(${d.source_name})` : ''}<br>
                        <span style="color: #6b7280;">
                            ${d.deleted_by?.full_name || 'Bilinmiyor'} tarafından silindi 
                            (${new Date(d.deleted_at).toLocaleString('tr-TR')})
                        </span>
                        ${d.reason ? `<br><em>Sebep: ${d.reason}</em>` : ''}
                    </div>
                `).join('')}
            </div>
        </details>
    `;
}

// Kalemleri render et (TAMAMLANMAYAN + TAMAMLANAN AYRI)
function renderItems(items) {
    const container = document.getElementById('groupedItems');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-center p-4 text-gray-500">Henüz ürün eklenmemiş.</div>';
        return;
    }

    const incomplete = items.filter(i => !i.is_checked);
    const completed = items.filter(i => i.is_checked);

    let html = '';

    // TAMAMLANMAYAN İŞLER
    if (incomplete.length > 0) {
        html += `
            <div style="background: #fef9e7; padding: 15px; border-left: 4px solid #f59e0b; margin-bottom: 2rem; border-radius: 8px;">
                <h3 style="color: #92400e; margin-bottom: 1rem; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${incomplete.length}</span>
                    Tamamlanmayan İşler
                </h3>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${incomplete.map(item => renderIncompleteItem(item)).join('')}
                </div>
            </div>
        `;
    }

    // TAMAMLANAN İŞLER
    if (completed.length > 0) {
        html += `
            <div style="background: #d1fae5; padding: 15px; border-left: 4px solid #059669; border-radius: 8px;">
                <h3 style="color: #065f46; margin-bottom: 1rem; font-size: 1.1rem;">✅ Tamamlanan İşler (${completed.length})</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${completed.map(item => renderCompletedItem(item)).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderIncompleteItem(item) {
    const productName = item.product ? item.product.name : item.custom_name;
    const sourceName = item.source ? item.source.name : '';

    return `
        <div class="item-row" data-item-id="${item.id}" style="padding: 12px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div class="item-checkbox" onclick="checkItem(${item.id})" style="cursor: pointer; font-size: 1.2rem; color: #d1d5db;">☐</div>
                
                <div class="item-details" style="flex: 1;">
                    <div class="item-name" style="font-size: 1.05rem; font-weight: 600; color: #1f2937; margin-bottom: 8px;">${productName}</div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <!-- Miktarlar -->
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 4px;">Gerekli</label>
                                <input type="number" class="form-input" style="padding: 4px 8px; font-size: 0.9rem;" 
                                    value="${item.quantity}" min="1" onblur="autoSaveQuantity(${item.id}, this.value)">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 4px;">Alınan</label>
                                <input type="number" class="form-input" style="padding: 4px 8px; font-size: 0.9rem;" 
                                    value="${item.quantity_found || ''}" min="0" onblur="autoSaveQuantityFound(${item.id}, this.value)">
                            </div>
                        </div>

                        <!-- Kaynaklar -->
                        <div>
                             <label style="font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 4px;">Kaynaklar</label>
                             ${renderTagsInput(item.id, sourceName)}
                        </div>
                    </div>

                    <!-- Eksik Durumu -->
                    ${item.quantity_found && item.quantity_found < item.quantity ? `
                        <div style="margin-top: 12px; background: #fee2e2; padding: 10px; border-radius: 6px; border-left: 3px solid #ef4444;">
                            <div style="font-weight: 600; color: #ef4444; margin-bottom: 8px; font-size: 0.9rem;">
                                ⚠️ ${item.quantity - item.quantity_found} adet eksik!
                            </div>
                            
                            <!-- Eksik Seçenekleri -->
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #374151;">
                                    <input type="radio" name="missing_reason_${item.id}" value="buy_from_source" 
                                        ${!item.missing_reason || item.missing_reason === 'buy_from_source' ? 'checked' : ''}
                                        onchange="updateMissingReason(${item.id}, 'buy_from_source')">
                                    📦 Başka yerden alınacak
                                </label>
                                
                                ${(!item.missing_reason || item.missing_reason === 'buy_from_source') ? `
                                    <div style="margin-left: 24px; margin-top: 5px; width: 100%; max-width: 400px;">
                                        ${renderTagsInput('missing-' + item.id, item.missing_source || '')}
                                    </div>
                                ` : ''}

                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #374151; margin-top: 5px;">
                                    <input type="radio" name="missing_reason_${item.id}" value="buy_later" 
                                        ${item.missing_reason === 'buy_later' ? 'checked' : ''}
                                        onchange="updateMissingReason(${item.id}, 'buy_later')">
                                    ⏰ Daha sonra alınacak
                                </label>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="item-actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})" title="Sil">🗑️</button>
                    <button class="btn btn-sm btn-success" onclick="checkItem(${item.id})" title="Tamamla">✅</button>
                </div>
            </div>
        </div>
    `;
}

function renderCompletedItem(item) {
    const productName = item.product ? item.product.name : item.custom_name;
    const sourceName = item.source ? item.source.name : 'Belirtilmedi';

    return `
        <div class="item-row item-checked" style="opacity: 0.7; background: #f9fafb; padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 12px;">
            <div class="item-checkbox" style="color: #059669;">✓</div>
            <div style="flex: 1;">
                <div style="font-weight: 500; text-decoration: line-through; color: #4b5563;">${productName}</div>
                <div style="font-size: 0.85rem; color: #6b7280;">
                    ${item.quantity_found || item.quantity} adet • 📦 ${sourceName}
                </div>
            </div>
            <button class="btn btn-sm btn-warning" onclick="uncheckItem(${item.id})" style="font-size: 0.8rem; padding: 2px 8px;">Geri Al</button>
        </div>
    `;
}

// Toggle Source Edit Function
function toggleSourceEdit(itemId) {
    const displayEl = document.getElementById(`source-display-${itemId}`);
    const editBtn = document.getElementById(`edit-btn-${itemId}`);
    const editContainer = document.getElementById(`source-edit-${itemId}`);
    const inputEl = document.getElementById(`tag-input-${itemId}`);

    if (displayEl && editContainer) {
        displayEl.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        editContainer.style.display = 'inline-flex';
        if (inputEl) {
            inputEl.focus();
            inputEl.select();
        }
    }
}

// Auto-save quantity (onBlur)
async function autoSaveQuantity(itemId, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (!quantity || quantity < 1) {
        showAlert('Geçerli bir miktar girin');
        await loadJobDetail(); // Reload to reset
        return;
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });

        if (!response.ok) throw new Error('Güncelleme başarısız');
        await loadJobDetail();

    } catch (error) {
        showAlert(error.message);
        await loadJobDetail();
    }
}

// Auto-save source (onBlur)
async function autoSaveSource(itemId, newSourceName) {
    const sourceName = newSourceName.trim();
    if (!sourceName) {
        showAlert('Kaynak adı boş olamaz');
        await loadJobDetail();
        return;
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_name: sourceName })
        });

        if (!response.ok) throw new Error('Güncelleme başarısız');
        await loadJobDetail();

    } catch (error) {
        showAlert(error.message);
        await loadJobDetail();
    }
}

// Auto-save quantity found (onBlur)
async function autoSaveQuantityFound(itemId, newValue) {
    try {
        await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity_found: parseInt(newValue) || 0 })
        });
        await loadJobDetail();
    } catch (error) {
        console.error('Quantity found update error:', error);
    }
}

// Auto-save quantity missing (onBlur)
async function autoSaveQuantityMissing(itemId, newValue) {
    try {
        await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity_missing: parseInt(newValue) || 0 })
        });
        await loadJobDetail();
    } catch (error) {
        console.error('Quantity missing update error:', error);
    }
}

// 3. Nereden alınacak (missing_source) - ARTIK TAG INPUT !
async function autoSaveMissingSource(itemId, newValue) {
    // Tag input'tan gelen değer zaten string (virgülle ayrılmış)
    await fetch(`/api/jobs/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missing_source: newValue })
    });
    // loadJobDetail(); // Reload gerekmez, tag input kendi yönetiyor
}

// Update missing reason (buy_from_source or buy_later)
async function updateMissingReason(itemId, reason) {
    try {
        await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missing_reason: reason })
        });
        await loadJobDetail(); // Reload to show/hide input
    } catch (error) {
        console.error('Missing reason update error:', error);
    }
}

// ===========================
// MAIN INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Data Loading
    await loadUserInfo();
    await loadSources();
    await loadJobDetail();

    // 2. Component Initialization

    // Quick Add Tag Input
    const quickAddContainer = document.getElementById('quick-add-source-container');
    if (quickAddContainer) {
        quickAddContainer.innerHTML = renderTagsInput('quick-add', '');
    }

    // Inline Search & Add Form
    initInlineSearch();
    initInlineAddForm();
});


// ===========================
// INLINE AUTOCOMPLETE & FORM
// ===========================

let inlineSearchTimeout = null;

// --- 2. Inline Product Search ---
function initInlineSearch() {
    const searchInput = document.getElementById('inlineProductSearch');
    const resultsDiv = document.getElementById('inlineProductResults');
    const hiddenId = document.getElementById('inlineSelectedProductId');
    const hiddenName = document.getElementById('inlineSelectedProductName');

    if (!searchInput || !resultsDiv) return;

    // Show results immediately on focus
    searchInput.addEventListener('focus', async () => {
        if (!searchInput.value.trim()) {
            await performSearch('');
        } else {
            await performSearch(searchInput.value);
        }
    });

    searchInput.addEventListener('input', async (e) => {
        await performSearch(e.target.value);
    });

    async function performSearch(query) {
        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');

            const products = await response.json();

            if (products.length === 0) {
                if (query.length > 0) {
                    resultsDiv.innerHTML = '<div class="p-2 text-gray-500">Ürün bulunamadı</div>';
                } else {
                    resultsDiv.innerHTML = '';
                }
                return;
            }

            resultsDiv.innerHTML = products.map(p => `
                <div class="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0" 
                     onclick="selectInlineProduct('${p.id}', '${p.name}')">
                    <div class="font-bold">${p.name}</div>
                    ${p.barcode ? `<div class="text-xs text-gray-500">${p.barcode}</div>` : ''}
                    ${p.current_stock !== undefined ? `<div class="text-xs text-blue-600">Stok: ${p.current_stock}</div>` : ''}
                </div>
            `).join('');

            resultsDiv.style.display = 'block';
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // Hide results on outside click
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.innerHTML = '';
        }
    });
}

window.selectInlineProduct = function (id, name) {
    const searchInput = document.getElementById('inlineProductSearch');
    const hiddenId = document.getElementById('inlineSelectedProductId');
    const hiddenName = document.getElementById('inlineSelectedProductName');
    const resultsDiv = document.getElementById('inlineProductResults');

    if (searchInput) searchInput.value = name;
    if (hiddenId) hiddenId.value = id;
    if (hiddenName) hiddenName.value = name;
    if (resultsDiv) resultsDiv.innerHTML = '';

    const qtyInput = document.getElementById('inlineQuantity');
    if (qtyInput) qtyInput.focus();
};

// 4. Inline Add Form
function initInlineAddForm() {
    const form = document.getElementById('inlineAddForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedProductId = document.getElementById('inlineSelectedProductId').value;
        const selectedProductName = document.getElementById('inlineSelectedProductName').value;
        const rawSearchValue = document.getElementById('inlineProductSearch').value.trim();

        // Priority: Selected Product > Raw Input
        const productId = selectedProductId || null;
        const productName = selectedProductName || rawSearchValue;

        // Tag input value (Hidden) check
        const sourceNameInput = document.getElementById('source-original-quick-add');
        const sourceName = sourceNameInput ? sourceNameInput.value : '';

        const quantity = document.getElementById('inlineQuantity').value;

        if (!productName) {
            showAlert('Lütfen bir ürün adı yazın veya seçin');
            return;
        }

        if (!sourceName) {
            showAlert('Lütfen kaynak girin (ve Enter tuşuna basın)');
            return;
        }

        try {
            const response = await fetch(`/api/jobs/${jobId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    custom_name: productId ? null : productName,
                    source_name: sourceName,
                    quantity: parseInt(quantity)
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Kalem eklenemedi');
            }

            showAlert('Kalem başarıyla eklendi!', 'success');

            // Reset Form - Clear everything including hidden fields
            document.getElementById('inlineProductSearch').value = '';
            document.getElementById('inlineSelectedProductId').value = '';
            document.getElementById('inlineSelectedProductName').value = '';
            const resultsDiv = document.getElementById('inlineProductResults');
            if (resultsDiv) resultsDiv.innerHTML = '';

            document.getElementById('inlineQuantity').value = '1';

            // Reset Tag Input
            const container = document.getElementById('quick-add-source-container');
            if (container) container.innerHTML = renderTagsInput('quick-add', '');

            // Refresh List
            await loadJobDetail();

        } catch (error) {
            showAlert(error.message);
        }
    });
}

// ===========================
// DÜZENLE MODAL
// ===========================

function openEditItemModal(itemId, productName, sourceId, quantity) {
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editProductName').value = productName;
    document.getElementById('editSource').value = sourceId;
    document.getElementById('editQuantity').value = quantity;
    document.getElementById('editItemModal').style.display = 'flex';
}

function closeEditItemModal() {
    document.getElementById('editItemModal').style.display = 'none';
}

// Edit form submit
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editItemForm');

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const itemId = document.getElementById('editItemId').value;
            const sourceId = document.getElementById('editSource').value;
            const quantity = document.getElementById('editQuantity').value;

            try {
                const response = await fetch(`/api/jobs/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source_id: parseInt(sourceId),
                        quantity: parseInt(quantity)
                    })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Kalem güncellenemedi');
                }

                showAlert('Kalem güncellendi!', 'success');
                closeEditItemModal();
                await loadJobDetail();

            } catch (error) {
                showAlert(error.message);
            }
        });
    }
});

// ===========================
// DELETE / CHECK / UNCHECK
// ===========================

// Kalem sil
async function deleteItem(itemId) {
    try {
        const response = await fetch(`/api/jobs/items/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Kalem silinemedi');
        }

        showAlert('Kalem silindi', 'success');
        await loadJobDetail();

    } catch (error) {
        showAlert(error.message);
    }
}

// Kalem işaretle
async function checkItem(itemId) {
    try {
        const response = await fetch(`/api/jobs/items/${itemId}/check`, {
            method: 'POST'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'İşaretleme başarısız');
        }

        showAlert('Kalem işaretlendi!', 'success');
        await loadJobDetail();

    } catch (error) {
        showAlert(error.message);
    }
}

// Kalem işaretini kaldır
async function uncheckItem(itemId) {
    try {
        const response = await fetch(`/api/jobs/items/${itemId}/uncheck`, {
            method: 'POST'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'İşaret kaldırılamadı');
        }

        showAlert('İşaret kaldırıldı', 'success');
        await loadJobDetail();

    } catch (error) {
        showAlert(error.message);
    }
}

// Split partial completion item into 2: completed (taken) + incomplete (missing)
async function splitItem(itemId) {
    try {
        const response = await fetch(`/api/jobs/items/${itemId}/split`, {
            method: 'POST'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'İşlem başarısız');
        }

        const result = await response.json();
        showAlert(result.message || 'Başarılı', 'success');
        await loadJobDetail();

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Split incomplete item (Quantity based)
async function splitIncompleteItem(itemId, currentQuantity) {
    const qtyStr = prompt(`Bu kalemden kaç adet ayırmak istiyorsunuz?\n(Mevcut Miktar: ${currentQuantity})`);
    if (qtyStr === null) return; // Cancelled

    const splitQty = parseInt(qtyStr);

    if (!splitQty || isNaN(splitQty) || splitQty <= 0 || splitQty >= currentQuantity) {
        alert('Geçersiz miktar! 1 ile ' + (currentQuantity - 1) + ' arasında bir sayı giriniz.');
        return;
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}/split`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ split_quantity: splitQty })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'İşlem başarısız');
        }

        const result = await response.json();
        showAlert(result.message || 'Kalem bölündü', 'success');
        await loadJobDetail();

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}


// ===========================
// TAG INPUT HELPERS
// ===========================

function renderTagsInput(itemId, currentSource) {
    // Virgülle ayrılmış stringi taglere çevir
    const tags = currentSource ? currentSource.split(',').map(s => s.trim()).filter(s => s) : [];

    // Tag renkleri
    const getTagColor = (tag) => {
        if (!isNaN(parseInt(tag))) return '#dcfce7'; // Miktar içeriyorsa yeşilimsi
        return '#e5e7eb'; // Standart gri
    };

    const tagsHtml = tags.map((tag, index) => `
        <span class="active-tag" style="background: ${getTagColor(tag)};">
            ${tag}
            <span class="remove-tag" onclick="removeSourceTag('${itemId}', ${index}); event.stopPropagation();">×</span>
        </span>
    `).join('');

    return `
        <div class="tag-container" onclick="document.getElementById('tag-input-${itemId}').focus()">
            ${tagsHtml}
            <input 
                type="text" 
                id="tag-input-${itemId}"
                class="tag-input-field" 
                placeholder="${tags.length > 0 ? '' : 'Kaynak ekle...'}"
                list="sourceList"
                onkeydown="handleTagKeydown(event, '${itemId}')"
                oninput="handleTagInput(event, '${itemId}')"
                onblur="handleTagBlur('${itemId}')"
            >
        </div>
        <!-- Hidden input for comparison -->
        <input type="hidden" id="source-original-${itemId}" value="${currentSource || ''}">
    `;
}

async function handleTagInput(event, itemId) {
    const input = event.target;
    const value = input.value.trim();
    if (!value) return;

    // Datalist kontrolü - Eğer tam eşleşme varsa otomatik ekle
    const list = document.getElementById('sourceList');
    if (list && list.options) {
        let match = false;
        for (let i = 0; i < list.options.length; i++) {
            if (list.options[i].value === value) {
                match = true;
                break;
            }
        }
        if (match) {
            // UI hissiyatı için çok kısa bir gecikme
            setTimeout(() => {
                addSourceTag(itemId, value);
                input.value = '';
                input.focus();
            }, 100);
        }
    }
}

async function handleTagKeydown(event, itemId) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        event.stopPropagation(); // Bubbling engelle
        const input = event.target;
        const value = input.value.trim();

        if (value) {
            await addSourceTag(itemId, value);
            input.value = '';
            input.focus();
        }
    }
    // Backspace handling
    if (event.key === 'Backspace' && event.target.value === '') {
        // Silme işlemi istenirse buraya eklenebilir
    }
}

async function handleTagBlur(itemId) {
    const input = document.getElementById(`tag-input-${itemId}`);
    if (input && input.value.trim()) {
        await addSourceTag(itemId, input.value.trim());
        input.value = '';
    }
}

async function addSourceTag(itemId, newTag) {
    const originalInput = document.getElementById(`source-original-${itemId}`);
    let currentSource = originalInput ? originalInput.value : '';
    let tags = currentSource ? currentSource.split(',').map(s => s.trim()).filter(s => s) : [];

    tags.push(newTag);
    const finalSourceString = tags.join(', ');

    // Quick Add Mode: DOM only update
    if (itemId === 'quick-add') {
        if (originalInput) originalInput.value = finalSourceString;
        const container = document.getElementById('quick-add-source-container');
        if (container) container.innerHTML = renderTagsInput('quick-add', finalSourceString);

        // Refocus logic
        setTimeout(() => {
            const input = document.getElementById('tag-input-quick-add');
            if (input) input.focus();
        }, 50);
        return;
    }

    // Missing Source Mode (Incomplete items)
    if (String(itemId).startsWith('missing-')) {
        const realItemId = String(itemId).replace('missing-', '');
        await autoSaveMissingSource(realItemId, finalSourceString);
        return;
    }

    await autoSaveSource(itemId, finalSourceString);
}


async function removeSourceTag(itemId, indexToRemove) {
    const originalInput = document.getElementById(`source-original-${itemId}`);
    let currentSource = originalInput ? originalInput.value : '';
    let tags = currentSource ? currentSource.split(',').map(s => s.trim()).filter(s => s) : [];

    if (indexToRemove >= 0 && indexToRemove < tags.length) {
        tags.splice(indexToRemove, 1);
        const finalSourceString = tags.join(', ');

        // Quick Add Mode: DOM only update
        if (itemId === 'quick-add') {
            if (originalInput) originalInput.value = finalSourceString;
            const container = document.getElementById('quick-add-source-container');
            if (container) container.innerHTML = renderTagsInput('quick-add', finalSourceString);
            return;
        }

        // Missing Source Mode (Incomplete items)
        if (String(itemId).startsWith('missing-')) {
            const realItemId = String(itemId).replace('missing-', '');
            await autoSaveMissingSource(realItemId, finalSourceString);
            return;
        }

        await autoSaveSource(itemId, finalSourceString);
    }
}
