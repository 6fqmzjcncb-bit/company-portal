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
// Helper: Group By
function groupBy(array, keyFn) {
    return array.reduce((result, item) => {
        const key = keyFn(item);
        (result[key] = result[key] || []).push(item);
        return result;
    }, {});
}

// Completion stats render (Updated UI)
function renderCompletionStats(completion, viewers) {
    const container = document.getElementById('completionStats');
    if (!container) return;

    const percentage = completion?.percentage || 0;
    const total = completion?.total || 0;
    const completed = completion?.completed || 0;
    const isDone = percentage === 100;

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
        <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
                    ${isDone ? '🎉 Harika İş!' : '📊 İlerleme Durumu'}
                    <span style="font-size: 0.9rem; font-weight: normal; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 99px;">
                        ${completed} / ${total} Kalem
                    </span>
                </h3>
                <div style="font-weight: 800; font-size: 1.5rem; color: ${isDone ? '#059669' : '#4f46e5'};">
                    %${percentage}
                </div>
            </div>
            
            <div style="background: #e5e7eb; height: 12px; width: 100%; border-radius: 99px; overflow: hidden; margin-bottom: 10px;">
                <div style="background: ${isDone ? '#059669' : 'linear-gradient(90deg, #4f46e5, #818cf8)'}; height: 100%; width: ${percentage}%; transition: width 0.5s ease-out; border-radius: 99px;"></div>
            </div>

            ${viewers && viewers.length > 0 ? `
                <div style="font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 5px;">
                    👁️ <strong>Görüntüleyenler:</strong> ${viewersHtml}
                </div>
            ` : ''}
        </div>
    `;
}

// Tamamlanmayan malzemeler (ARTIK KULLANILMIYOR - renderItems içinde birleştirildi)
function renderIncompleteItems(items) {
    const container = document.getElementById('incompleteItems');
    if (container) container.innerHTML = '';
}

// Kalemleri render et (YENİ TASARIM: YAPILACAKLAR vs TAMAMLANANLAR)
function renderItems(items) {
    const container = document.getElementById('groupedItems');
    if (!container) return; // Guard

    if (!items || items.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color: #9ca3af;">Henüz hiç kalem eklenmemiş.</div>';
        return;
    }

    // 1. Grupları Ayır
    const incomplete = items.filter(i => !i.is_checked);
    const partial = items.filter(i => i.is_checked && i.quantity_found && i.quantity_found < i.quantity);
    const completed = items.filter(i => i.is_checked && (!i.quantity_found || i.quantity_found === i.quantity));

    // 2. YAPILACAKLAR LİSTESİ (Todos)
    let todos = [];

    // a. Hiç başlanmamışlar
    incomplete.forEach(item => {
        todos.push({
            type: 'incomplete', // Tamamen yapılmamış
            data: item,
            displayQty: item.quantity,
            sourceGroup: item.missing_source || (item.source ? item.source.name : 'Belirsiz Kaynak')
        });
    });

    // b. Yarım kalmışların EKSİK kısmı
    partial.forEach(item => {
        todos.push({
            type: 'partial_missing', // Kısmı eksik
            data: item,
            displayQty: item.quantity - item.quantity_found,
            sourceGroup: item.missing_source || (item.source ? item.source.name : 'Belirsiz Kaynak')
        });
    });

    // 3. TAMAMLANANLAR LİSTESİ (Dones)
    let dones = [];

    // a. Tamamlanmışlar
    completed.forEach(item => {
        dones.push({
            type: 'completed',
            data: item,
            displayQty: item.quantity_found || item.quantity,
            sourceGroup: item.source ? item.source.name : 'Belirsiz Kaynak'
        });
    });

    // b. Yarım kalmışların ALINAN kısmı (Sadece alınan kısmını göster)
    partial.forEach(item => {
        if (item.quantity_found > 0) {
            dones.push({
                type: 'partial_taken',
                data: item,
                displayQty: item.quantity_found,
                sourceGroup: item.source ? item.source.name : 'Belirsiz Kaynak'
            });
        }
    });

    // 4. Gruplama
    const todosBySource = groupBy(todos, t => t.sourceGroup);
    const donesBySource = groupBy(dones, d => d.sourceGroup);

    // 5. HTML Oluşturma
    let html = '';

    // --- YAPILACAKLAR BÖLÜMÜ ---
    if (Object.keys(todosBySource).length > 0) {
        html += `<div style="margin-bottom: 40px;">`;
        html += `<h2 style="font-size: 1.2rem; color: #1f2937; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📌 Yapılacaklar</h2>`;

        Object.keys(todosBySource).sort().forEach(sourceName => {
            const groupItems = todosBySource[sourceName];
            // Source Card
            html += `
                <div style="background: white; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e5e7eb;">
                    <!-- Header with distinct color -->
                    <div style="background: #f9fafb; padding: 12px 15px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1rem; color: #374151; font-weight: 700;">📦 ${sourceName}</h3>
                        <span style="font-size: 0.8rem; background: #e5e7eb; color: #6b7280; padding: 2px 8px; border-radius: 99px;">${groupItems.length} Kalem</span>
                    </div>
                    <div style="padding: 0;">
            `;

            // Items in this source
            groupItems.forEach(todo => {
                const item = todo.data;
                const isPartial = todo.type === 'partial_missing';
                const productName = item.product ? item.product.name : item.custom_name;

                html += `
                    <div style="padding: 15px; border-bottom: 1px solid #f3f4f6; position: relative;">
                         ${isPartial ? `<div style="position: absolute; top: 0; left: 0; bottom: 0; width: 4px; background: #f59e0b;"></div>` : ''}
                         
                         <div style="display: flex; gap: 12px; align-items: flex-start;">
                            <!-- Checkbox / Action -->
                            <div style="margin-top: 4px;">
                                ${isPartial ?
                        `<span style="font-size: 1.2rem;" title="Kısmi eksik">⚠️</span>` :
                        `<div class="item-checkbox" onclick="toggleItemCheck(${item.id})" style="border: 2px solid #d1d5db; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;"></div>`
                    }
                            </div>

                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div>
                                        <div style="font-weight: 600; font-size: 1.05rem; color: #111827;">${productName}</div>
                                        ${isPartial ? `<div style="color: #d97706; font-size: 0.85rem; font-weight: 600; margin-top: 2px;">⚠️ ${todo.displayQty} adet eksik kaldı!</div>` : ''}
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="editItem(${item.id})" title="Düzenle">✏️</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})" title="Sil">🗑️</button>
                                        ${isPartial ? `<button class="btn btn-sm btn-success" onclick="checkItem(${item.id})">☑️ Tamamla</button>` : ''}
                                    </div>
                                </div>

                                <!-- Inputs Grid -->
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 12px;">
                                    <!-- Miktar Input -->
                                    <div>
                                        <label style="font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 4px;">Gerekli Miktar</label>
                                        <input type="number" class="input-small" value="${todo.displayQty}" ${isPartial ? 'readonly' : `onblur="autoSaveQuantity(${item.id}, this.value)"`} style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                                    </div>

                                    <!-- Alınan Input (Sadece Incomplete için) -->
                                    ${!isPartial ? `
                                        <div>
                                            <label style="font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 4px;">Alınan Adet</label>
                                            <input type="number" class="input-small" value="${item.quantity_found || ''}" placeholder="Kaç tane?" onblur="autoSaveQuantityFound(${item.id}, this.value)" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        </div>
                                    ` : ''}

                                    <!-- Kaynak Input -->
                                    <div>
                                        <label style="font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 4px;">Kaynak Değiştir</label>
                                        <input type="text" class="input-small" value="${item.missing_source || (item.source ? item.source.name : '')}" list="sourceList" 
                                            onblur="${isPartial ? `autoSaveMissingSource(${item.id}, this.value)` : `autoSaveSource(${item.id}, this.value)`}" 
                                            placeholder="Kaynak" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                `;
            });

            html += `</div></div>`; // End card
        });

        html += `</div>`; // End Yapılacaklar
    } else {
        html += `<div style="text-align: center; padding: 40px; color: #6b7280; background: #f9fafb; border-radius: 12px; margin-bottom: 30px; border: 1px dashed #d1d5db;">🎉 Harika! Yapılacak iş kalmadı.</div>`;
    }

    // --- TAMAMLANANLAR BÖLÜMÜ ---
    if (Object.keys(donesBySource).length > 0) {
        html += `<div style="opacity: 0.6; filter: grayscale(1); transition: all 0.4s ease;" onmouseenter="this.style.opacity='1'; this.style.filter='grayscale(0)'" onmouseleave="this.style.opacity='0.6'; this.style.filter='grayscale(1)'">`;
        html += `<h2 style="font-size: 1.2rem; color: #059669; margin-bottom: 15px; border-bottom: 2px solid #a7f3d0; padding-bottom: 10px;">✅ Tamamlananlar</h2>`;

        Object.keys(donesBySource).sort().forEach(sourceName => {
            const groupItems = donesBySource[sourceName];

            html += `
                <div style="background: #f0fdf4; border-radius: 12px; margin-bottom: 20px; border: 1px solid #bbf7d0; overflow: hidden;">
                    <div style="background: #dcfce7; padding: 10px 15px; border-bottom: 1px solid #bbf7d0; display: flex; justify-content: space-between;">
                         <h3 style="margin: 0; font-size: 0.95rem; color: #166534;">${sourceName}</h3>
                         <span style="font-size: 0.8rem; color: #166534;">${groupItems.length} Kalem</span>
                    </div>
                    <div>
            `;

            groupItems.forEach(done => {
                const item = done.data;
                const isPartialTaken = done.type === 'partial_taken';
                const productName = item.product ? item.product.name : item.custom_name;

                html += `
                    <div style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 1.2rem; color: #059669;">✓</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #1f2937; text-decoration: line-through;">${productName}</div>
                            <div style="font-size: 0.85rem; color: #059669;">
                                ${done.displayQty} adet alındı
                                ${isPartialTaken ? `<span style="color: #dc2626; font-weight: 600;">(Parça Alım)</span>` : ''}
                                <span style="color: #6b7280; font-size: 0.8rem;">• ${item.checked_at ? new Date(item.checked_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-warning" onclick="uncheckItem(${item.id})" title="Geri Al">↩️</button>
                    </div>
                `;
            });

            html += `</div></div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
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
        const response = await fetch(`/ api / jobs / items / ${itemId} `, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });

        if (!response.ok) {
            throw new Error('Güncelleme başarısız');
        }

        // Silent success - no alert, just reload
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
        const response = await fetch(`/ api / jobs / items / ${itemId} `, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_name: sourceName })
        });

        if (!response.ok) {
            throw new Error('Güncelleme başarısız');
        }

        // Silent success
        await loadJobDetail();
    } catch (error) {
        showAlert(error.message);
        await loadJobDetail();
    }
}
// Auto-save quantity found (onBlur)
async function autoSaveQuantityFound(itemId, newValue) {
    try {
        await fetch(`/ api / jobs / items / ${itemId} `, {
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
        await fetch(`/ api / jobs / items / ${itemId} `, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity_missing: parseInt(newValue) || 0 })
        });
        await loadJobDetail();
    } catch (error) {
        console.error('Quantity missing update error:', error);
    }
}

// Auto-save missing source (nereden alınacak)
async function autoSaveMissingSource(itemId, newValue) {
    try {
        await fetch(`/ api / jobs / items / ${itemId} `, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missing_source: newValue })
        });
        await loadJobDetail();
    } catch (error) {
        console.error('Missing source update error:', error);
    }
}

// Update missing reason (buy_from_source or buy_later)
async function updateMissingReason(itemId, reason) {
    try {
        await fetch(`/ api / jobs / items / ${itemId} `, {
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
// INLINE AUTOCOMPLETE
// ===========================

// Inline autocomplete için ürün arama
let inlineSearchTimeout = null;
document.addEventListener('DOMContentLoaded', () => {
    const inlineSearch = document.getElementById('inlineProductSearch');

    if (inlineSearch) {
        inlineSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            clearTimeout(inlineSearchTimeout);

            if (query.length < 1) {
                document.getElementById('inlineProductResults').innerHTML = '';
                document.getElementById('inlineSelectedProductId').value = '';
                document.getElementById('inlineSelectedProductName').value = '';
                return;
            }

            inlineSearchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/ api / products / search ? q = ${encodeURIComponent(query)} `);
                    const products = await response.json();

                    const resultsContainer = document.getElementById('inlineProductResults');

                    if (products.length === 0) {
                        resultsContainer.innerHTML = '<div class="no-results">Ürün bulunamadı</div>';
                        return;
                    }

                    resultsContainer.innerHTML = `
                < div class="autocomplete-results" >
                    ${products.map(p => `
                                <div class="autocomplete-item" onclick="selectInlineProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
                                    <strong>${p.name}</strong>
                                    ${p.barcode ? `<span>${p.barcode}</span>` : ''}
                                    ${currentUser && currentUser.role === 'admin' ? `<span>Stok: ${p.current_stock}</span>` : ''}
                                </div>
                            `).join('')
                        }
                        </div >
                `;
                } catch (error) {
                    console.error('Product search error:', error);
                }
            }, 300);
        });
    }
});

// Inline'dan ürün seç
function selectInlineProduct(productId, productName) {
    document.getElementById('inlineProductSearch').value = productName;
    document.getElementById('inlineSelectedProductId').value = productId;
    document.getElementById('inlineSelectedProductName').value = productName;
    document.getElementById('inlineProductResults').innerHTML = '';
}

// Inline form submit
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('inlineAddForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const productId = document.getElementById('inlineSelectedProductId').value;
            const productName = document.getElementById('inlineSelectedProductName').value;
            const sourceId = document.getElementById('inlineSourceSelect').value;
            const quantity = document.getElementById('inlineQuantity').value;

            if (!productId && !productName) {
                showAlert('Lütfen bir ürün seçin');
                return;
            }

            if (!sourceId) {
                showAlert('Lütfen kaynak seçin');
                return;
            }

            try {
                const response = await fetch(`/ api / jobs / ${jobId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_id: productId || null,
                        custom_name: productId ? null : productName,
                        source_id: parseInt(sourceId),
                        quantity: parseInt(quantity)
                    })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Kalem eklenemedi');
                }

                showAlert('Kalem başarıyla eklendi!', 'success');

                // Formu temizle
                document.getElementById('inlineProductSearch').value = '';
                document.getElementById('inlineSelectedProductId').value = '';
                document.getElementById('inlineSelectedProductName').value = '';
                document.getElementById('inlineQuantity').value = '1';
                document.getElementById('inlineProductResults').innerHTML = '';

                // Listeyi yenile
                await loadJobDetail();

            } catch (error) {
                showAlert(error.message);
            }
        });
    }
});

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

// ===========================
// INIT
// ===========================

window.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    await loadSources();
    await loadJobDetail();
});

// Split partial completion item into 2: completed (taken) + incomplete (missing)
async function splitItem(itemId) {
    if (!confirm('Alınan kısmı tamamlananlara, eksik kısmı yeni satıra eklemek istediğinizden emin misiniz?')) return;

    try {
        const response = await fetch(`/api/jobs/items/${itemId}/split`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'İşlem başarısız');
            return;
        }

        await loadJobDetail();
    } catch (error) {
        console.error('Split error:', error);
        alert('Bir hata oluştu');
    }
}
