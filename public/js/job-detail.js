// Global değişkenler
let jobId = null;
let currentUser = null;
let sources = [];
let availableSourceNames = [];
let units = [];

// URL'den job ID al
const urlParams = new URLSearchParams(window.location.search);
jobId = urlParams.get('id');

if (!jobId) {
    showAlert('İş listesi ID bulunamadı');
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
        availableSourceNames = [];
        const sourceList = document.getElementById('sourceList');
        if (sourceList) {
            sourceList.innerHTML = '';
            sources.forEach(source => {
                availableSourceNames.push(source.name);
                const option = document.createElement('option');
                option.value = source.name;
                sourceList.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Sources load error:', error);
    }
}

// Birimleri yükle
async function loadUnits() {
    try {
        const response = await fetch('/api/units');
        if (!response.ok) return;
        units = await response.json();

        // Inline form unit select
        const inlineUnitSelect = document.getElementById('inlineProductUnit');
        if (inlineUnitSelect) {
            inlineUnitSelect.innerHTML = '';
            units.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.name;
                opt.textContent = u.name;
                if (u.name.toLowerCase() === 'adet') opt.selected = true;
                inlineUnitSelect.appendChild(opt);
            });
        }

        // Edit modal unit select
        const editUnitSelect = document.getElementById('editUnit');
        if (editUnitSelect) {
            editUnitSelect.innerHTML = '';
            units.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.name;
                opt.textContent = u.name;
                if (u.name.toLowerCase() === 'adet') opt.selected = true;
                editUnitSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Units load error:', error);
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

    // Show ALL items that have missing parts, even if checked (e.g. checked but "buy later")
    const incomplete = items.filter(item => item.quantity_missing > 0);

    if (incomplete.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 5px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h3 style="margin: 0 0 15px 0; font-size: 1.1rem; color: #991b1b; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                ⚠️ Eksikler (${incomplete.length})
            </h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${incomplete.map(item => {
        const productName = item.product ? item.product.name : item.custom_name;
        const sourceName = item.missing_source ? item.missing_source : 'Belirtilmedi';
        return `
                        <div style="background: white; padding: 12px 16px; border-radius: 8px; border: 1px solid #fca5a5; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            
                            <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1;">
                                <div style="font-size: 1.4rem; line-height: 1;">⚠️</div>
                                
                                <div>
                                    <div style="font-weight: 700; color: #1f2937; font-size: 1rem; margin-bottom: 4px;">
                                        ${productName} 
                                        <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-left: 8px;">
                                            ✓ ${item.quantity_found || 0} alındı • ✕ ${item.quantity_missing} eksik
                                        </span>
                                    </div>
                                    <div style="font-size: 0.9rem; color: #4b5563; display: flex; align-items: center; gap: 6px;">
                                        📦 Alınacak Yer: <strong>${sourceName}</strong>
                                        ${item.note ? `<span style="margin-left:8px; color:#f59e0b;">📝 ${item.note}</span>` : ''}
                                        <button onclick="openEditItemModal(${item.id}, '${productName.replace(/'/g, "\\'")}', ${item.source_id || 'null'}, ${item.quantity})" style="border:none; background:none; cursor:pointer; font-size:0.9rem;" title="Düzenle">✏️</button>
                                    </div>
                                </div>
                            </div>

                            <button onclick="resolveMissingItem(${item.id})" class="btn" style="background: #059669; color: white; padding: 6px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                ✅ Alındı
                            </button>
                        </div>
                    `;
    }).join('')}
            </div>
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
                    <div style="padding: 8px; margin-top: 5px; background: white; border-radius: 4px; font-size: 0.85rem; border: 1px solid #fee2e2;">
                        <button onclick="restoreDeletion(${d.id})" class="btn btn-sm" style="float: right; padding: 2px 8px; font-size: 0.8rem; background: #10b981; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 2px;">
                            ↩ Geri Al
                        </button>
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

// Kalemleri render et (TAMAMLANMAYAN + TAMAMLANAN AYRI YERLERE)
function renderItems(items) {
    const incompleteContainer = document.getElementById('incompleteJobsList');
    const completedContainer = document.getElementById('completedJobsList');

    // Clear both
    if (incompleteContainer) incompleteContainer.innerHTML = '';
    if (completedContainer) completedContainer.innerHTML = '';

    if (!items || items.length === 0) {
        if (incompleteContainer) incompleteContainer.innerHTML = '<div class="text-center p-4 text-gray-500">Henüz ürün eklenmemiş.</div>';
        return;
    }

    const incomplete = items.filter(i => !i.is_checked);
    const completed = items.filter(i => i.is_checked);

    // 1. TAMAMLANMAYAN İŞLER (Yukarı)
    if (incomplete.length > 0 && incompleteContainer) {
        incompleteContainer.innerHTML = `
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

    // 2. TAMAMLANAN İŞLER (Aşağı - Eksiklerden Sonra)
    if (completed.length > 0 && completedContainer) {
        completedContainer.innerHTML = `
            <div style="background: #d1fae5; padding: 15px; border-left: 4px solid #059669; border-radius: 8px; margin-top: 2rem;">
                <h3 style="color: #065f46; margin-bottom: 1rem; font-size: 1.1rem;">✅ Tamamlanan İşler (${completed.length})</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${completed.map(item => renderCompletedItem(item)).join('')}
                </div>
            </div>
        `;
    }
}

function renderIncompleteItem(item) {
    const productName = item.product ? item.product.name : item.custom_name;
    const sourceName = item.source ? item.source.name : '';

    const unitText = item.unit || (item.product ? item.product.unit : 'Adet') || 'Adet';

    return `
        <div class="job-item-card" data-item-id="${item.id}">
            <!-- HEADER: Checkbox + Name + Actions -->
            <div class="card-header-row">
                <div class="item-checkbox-custom" onclick="checkItem(${item.id})" title="Tamamla">
                    <span style="font-size: 1.2rem; line-height: 1;">✓</span>
                </div>
                
                <div class="card-product-name">${productName}</div>

                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})" title="Sil" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; padding: 0;">🗑️</button>
                    <button class="btn btn-sm btn-success" onclick="checkItem(${item.id})" title="Tamamla" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; padding: 0;">✅</button>
                </div>
            </div>

            <!-- BODY: Inputs Grid -->
            <div class="card-body-grid">
                <!-- Col 1: Required -->
                <div>
                     <span class="input-group-label">Gerekli</span>
                     <div style="display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; height: 38px;">
                         <input type="number" class="qty-input-field" id="req-qty-${item.id}"
                                value="${item.quantity}" min="1" 
                                style="border: none; border-radius: 0; outline: none; box-shadow: none; height: 100%; text-align: center; flex: 1; padding: 0;"
                                oninput="handleQuantityChange(${item.id})"
                                onblur="autoSaveQuantity(${item.id}, this.value)">
                         <div style="background: #f3f4f6; color: #4b5563; padding: 0 10px; height: 100%; display: flex; align-items: center; border-left: 1px solid #d1d5db; font-size: 0.85rem; white-space: nowrap;">
                             ${unitText}
                         </div>
                     </div>
                </div>

                <!-- Col 2: Received -->
                <div>
                     <span class="input-group-label">Alınan</span>
                     <input type="number" class="qty-input-field" id="found-qty-${item.id}"
                            value="${item.quantity_found !== null && item.quantity_found !== undefined ? item.quantity_found : ''}" min="0" 
                            oninput="handleQuantityChange(${item.id})"
                            onblur="autoSaveQuantityFound(${item.id}, this.value)">
                </div>

                <!-- Col 3: Source -->
                <div class="source-col">
                    <span class="input-group-label">Tedarik Kaynağı</span>
                    ${renderTagsInput(item.id, sourceName)}
                </div>

                <!-- Col 4: Note -->
                <div class="note-col">
                    <span class="input-group-label">Personel Notu</span>
                    <input type="text" class="note-input"
                           value="${item.note || ''}" 
                           placeholder="Bir not yazın..." 
                           onblur="autoSaveNote(${item.id}, this.value)">
                </div>
            </div>

            <!-- EXCEPTION: Missing Quantity Warning -->
            <div id="missing-panel-${item.id}" style="display: ${(item.quantity_found !== undefined && item.quantity_found !== null && item.quantity_found < item.quantity) ? 'block' : 'none'}; margin-top: 12px; background: #fee2e2; padding: 10px; border-radius: 6px; border-left: 3px solid #ef4444;">
                <div id="missing-text-${item.id}" style="font-weight: 600; color: #ef4444; margin-bottom: 8px; font-size: 0.9rem;">
                    ⚠️ ${item.quantity - (item.quantity_found || 0)} adet eksik!
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #374151;">
                        <input type="radio" name="missing_reason_${item.id}" value="buy_from_source" 
                            ${!item.missing_reason || item.missing_reason === 'buy_from_source' ? 'checked' : ''}
                            onchange="updateMissingReason(${item.id}, 'buy_from_source')">
                        📦 Başka yerden alınacak
                    </label>
                    
                    <div id="missing-source-container-${item.id}" style="display: ${(!item.missing_reason || item.missing_reason === 'buy_from_source') ? 'block' : 'none'}; margin-left: 24px; margin-top: 5px; box-sizing: border-box; width: calc(100% - 24px);">
                        ${renderTagsInput('missing-' + item.id, item.missing_source || '')}
                    </div>

                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #374151; margin-top: 5px;">
                        <input type="radio" name="missing_reason_${item.id}" value="buy_later" 
                            ${item.missing_reason === 'buy_later' ? 'checked' : ''}
                            onchange="updateMissingReason(${item.id}, 'buy_later')">
                        ⏰ Daha sonra alınacak
                    </label>
                </div>
            </div>
        </div>
    `;
}

function renderCompletedItem(item) {
    const productName = item.product ? item.product.name : item.custom_name;
    const sourceName = item.source ? item.source.name : 'Belirtilmedi';
    const unitText = item.unit || (item.product ? item.product.unit : 'Adet') || 'Adet';

    // Status Badge Logic
    let statusBadge = '';

    if (item.quantity_missing > 0) {
        // Partial (Red Badge)
        statusBadge = `
            <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-left: 8px; white-space: nowrap;">
                 ✓ ${item.quantity_found || 0} ${unitText} alındı • ✕ ${item.quantity_missing} eksik
            </span>
        `;
    } else {
        // Full (Green Badge)
        statusBadge = `
            <span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-left: 8px; white-space: nowrap;">
                 ✓ ${item.quantity} ${unitText} tam alındı
            </span>
        `;
    }

    return `
        <div class="item-row item-checked" style="background: white; padding: 12px 16px; border-radius: 8px; border: 1px solid #10b981; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="min-width: 24px; min-height: 24px; width: 24px; height: 24px; background: #10b981; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; font-weight: bold;">✓</div>
            <div style="flex: 1;">
                <div style="font-weight: 700; color: #1f2937; font-size: 1rem; margin-bottom: 4px; display: flex; align-items: center; flex-wrap: wrap;">
                    ${productName}
                    ${statusBadge}
                </div>
                <div style="font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 6px;">
                    <span>📦 ${sourceName}</span>
                    ${item.note ? `<span style="color:#f59e0b;">• 📝 ${item.note}</span>` : ''}
                </div>
            </div>
            <button class="btn btn-sm btn-warning" onclick="uncheckItem(${item.id})" style="font-size: 0.8rem; padding: 4px 12px; border-radius: 6px;">Geri Al</button>
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
        return;
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
        if (!response.ok) throw new Error('Güncelleme başarısız');
    } catch (error) {
        showAlert(error.message);
    }
}

// Global Quantity Handle Local UI Feedback (Instant)
window.handleQuantityChange = function (itemId) {
    const reqInput = document.getElementById(`req-qty-${itemId}`);
    const foundInput = document.getElementById(`found-qty-${itemId}`);
    const missingPanel = document.getElementById(`missing-panel-${itemId}`);
    const missingText = document.getElementById(`missing-text-${itemId}`);

    if (!reqInput || !foundInput || !missingPanel || !missingText) return;

    const reqVal = parseInt(reqInput.value) || 0;
    const foundText = foundInput.value.trim();

    // If empty text, treat as no panel yet 
    if (foundText === '') {
        missingPanel.style.display = 'none';
        return;
    }

    const foundVal = parseInt(foundText) || 0;

    if (foundVal < reqVal) {
        // Show panel instantly
        missingPanel.style.display = 'block';
        missingText.innerHTML = `⚠️ ${reqVal - foundVal} adet eksik!`;
    } else {
        // Hide panel instantly
        missingPanel.style.display = 'none';
    }
};

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
    if (String(newValue).trim() === '') return; // Don't save empty
    try {
        await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity_found: parseInt(newValue) || 0 })
        });
        // We do NOT call loadJobDetail() here anymore to prevent 
        // focus loss when users immediately jump to the "missing source" input.
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

        // Show/hide locally instead of full reload to prevent visual jump
        const container = document.getElementById(`missing-source-container-${itemId}`);
        if (container) {
            container.style.display = reason === 'buy_from_source' ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Missing reason update error:', error);
    }
}

// Update note
async function autoSaveNote(itemId, note) {
    try {
        await fetch(`/api/jobs/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: note })
        });
        // No reload needed for simple text input
    } catch (error) {
        console.error('Note update error:', error);
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
        document.getElementById('inlineProductInfo').style.display = 'none';
        document.getElementById('inlineSelectedProductId').value = '';
        document.getElementById('inlineSelectedProductName').value = '';

        const unitSelect = document.getElementById('inlineProductUnit');
        if (unitSelect) {
            unitSelect.disabled = false; // Unlock for custom typing
            unitSelect.style.pointerEvents = 'auto'; // Fix iOS simulation lock
            unitSelect.style.background = 'white';
            unitSelect.style.color = '#1f2937';
        }

        await performSearch(e.target.value);
    });

    async function performSearch(query) {
        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');

            const products = await response.json();

            if (products.length === 0) {
                if (query.length > 0) {
                    resultsDiv.innerHTML = '<div style="padding: 10px 12px; color: #6b7280; font-size: 0.95rem; text-align: center;">Ürün bulunamadı</div>';
                    resultsDiv.style.display = 'block';
                } else {
                    resultsDiv.style.display = 'none';
                    resultsDiv.innerHTML = '';
                }
                return;
            }

            resultsDiv.innerHTML = products.map(p => `
                <div class="search-result-item" 
                     onmousedown="event.preventDefault(); window.selectInlineProduct(this.getAttribute('data-id'), this.getAttribute('data-name'), this.getAttribute('data-unit'), this.getAttribute('data-barcode'), this.getAttribute('data-stock'))"
                     style="display: grid; grid-template-columns: 80px 1fr 100px; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; background: white; transition: all 0.2s ease;"
                     onmouseover="this.style.background='#f0f9ff'; this.querySelector('.prod-name').style.color='#0284c7';" 
                     onmouseout="this.style.background='white'; this.querySelector('.prod-name').style.color='#374151';"
                     data-id="${p.id}"
                     data-name="${p.name.replace(/"/g, '&quot;')}"
                     data-unit="${p.unit || ''}"
                     data-barcode="${p.barcode || ''}"
                     data-stock="${(p.current_stock !== undefined && p.current_stock !== null) ? p.current_stock : ''}">
                    
                    <div style="pointer-events: none; font-size: 0.85rem; color: #111827; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${p.barcode || '-'}
                    </div>

                    <div class="prod-name" style="pointer-events: none; font-size: 0.95rem; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.2s ease;" title="${p.name.replace(/"/g, '&quot;')}">
                        ${p.name}
                    </div>

                    <div style="pointer-events: none; text-align: right;">
                         <span style="font-size: 0.85rem; font-weight: bold; color: ${p.current_stock > 0 ? '#1d4ed8' : '#dc2626'}">
                             Stok: ${(p.current_stock !== undefined && p.current_stock !== null) ? p.current_stock : 0}
                         </span>
                    </div>
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
            resultsDiv.style.display = 'none';
        }
    });
}

window.selectInlineProduct = function (id, name, unit = 'Adet', barcode = '', stock = '') {
    const searchInput = document.getElementById('inlineProductSearch');
    const hiddenId = document.getElementById('inlineSelectedProductId');
    const hiddenName = document.getElementById('inlineSelectedProductName');
    const resultsDiv = document.getElementById('inlineProductResults');
    const unitSelect = document.getElementById('inlineProductUnit');
    const infoDiv = document.getElementById('inlineProductInfo');

    if (searchInput) searchInput.value = name;
    if (hiddenId) hiddenId.value = id;
    if (hiddenName) hiddenName.value = name;
    if (unitSelect) {
        if (unit) {
            // Dropdown options are Title Case ("Adet", "Metre", "Paket"), so format it
            const formattedUnit = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
            unitSelect.value = formattedUnit;
            // Fallback to Adet if it still wasn't found
            if (!unitSelect.value) unitSelect.value = 'Adet';
        } else {
            unitSelect.value = 'Adet';
        }
        // Remove disabled attribute to bypass iOS Safari's broken native disabled styling
        unitSelect.disabled = false;

        // Use pointer-events and visual styles to simulate disabled state
        unitSelect.style.pointerEvents = !!id ? 'none' : 'auto';
        unitSelect.style.background = !!id ? '#f3f4f6' : 'white';
        unitSelect.style.color = !!id ? '#4b5563' : '#1f2937';
    }

    // Auto-select Default Source
    const sourceContainer = document.getElementById('quick-add-source-container');
    if (id && typeof sources !== 'undefined' && sources.length > 0) {
        let defaultSource = sources.find(s => s.name.toLowerCase() === 'merkez depo' || s.name.toLowerCase() === 'depo')
            || sources.find(s => s.type === 'internal')
            || sources[0];

        if (defaultSource && sourceContainer) {
            sourceContainer.innerHTML = renderTagsInput('quick-add', defaultSource.name);
        }
    } else if (sourceContainer) {
        sourceContainer.innerHTML = renderTagsInput('quick-add', '');
    }

    if (infoDiv) {
        const hasBarcode = barcode && barcode !== 'null' && barcode !== 'undefined' && barcode !== '-';
        const hasStock = stock !== '' && stock !== 'null' && stock !== 'undefined';

        if (hasBarcode || hasStock) {
            let infoHtml = '';
            if (hasBarcode) {
                infoHtml += `<strong>Barkod:</strong> ${barcode}`;
                if (hasStock) infoHtml += ` &nbsp;|&nbsp; `;
            }
            if (hasStock) {
                const stockColor = parseInt(stock) > 0 ? '#4b5563' : '#dc2626';
                const formattedUnitDisplay = unit ? (unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()) : 'Adet';
                infoHtml += `<span style="color: ${stockColor};"><strong>Stok:</strong> ${stock} ${formattedUnitDisplay}</span>`;
            }
            infoDiv.innerHTML = infoHtml;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.style.display = 'none';
        }
    }

    if (resultsDiv) {
        resultsDiv.style.display = 'none';
        resultsDiv.innerHTML = '';
    }

    const qtyInput = document.getElementById('inlineQuantity');
    if (qtyInput) {
        qtyInput.value = '';
        qtyInput.focus();
    }
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
        const unit = document.getElementById('inlineProductUnit').value;

        // If user typed something completely new and it DOES NOT match the hidden name,
        // it means they want to add a custom/unlisted product.
        let finalProductId = productId;
        let finalProductName = productName;
        if (rawSearchValue.toLowerCase() !== selectedProductName.toLowerCase()) {
            finalProductId = null; // Forces it to be treated as a new custom item
            finalProductName = rawSearchValue;
        }

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
                    product_id: finalProductId,
                    custom_name: finalProductId ? null : finalProductName,
                    unit: unit, // explicitly pass the unit for custom products
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

            document.getElementById('inlineQuantity').value = '';
            document.getElementById('inlineProductUnit').value = 'Adet';
            const infoDiv = document.getElementById('inlineProductInfo');
            if (infoDiv) infoDiv.style.display = 'none';

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
    document.getElementById('editQuantity').value = quantity;

    const modal = document.getElementById('editItemModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeEditItemModal() {
    const modal = document.getElementById('editItemModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Event Listeners (Sayfa Yüklendiğinde)
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadSources();
    loadUnits();
    loadJobDetail();
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
// DELETE / RESTORE / CHECK / UNCHECK
// ===========================

// Silinen Öğeyi Geri Al (RESTORE)
async function restoreDeletion(deletionId) {
    try {
        const response = await fetch(`/api/jobs/deletions/${deletionId}/restore`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Geri alma başarısız');
        }
        showAlert('Silinen liste elemanı geri alındı!', 'success');
        await loadJobDetail(); // Refresh UI to move it back up
    } catch (error) {
        showAlert(error.message);
    }
}

// Kalem sil (Anında - Gecikmesiz)
async function deleteItem(itemId) {
    const card = document.querySelector(`.job-item-card[data-item-id="${itemId}"]`);
    if (card) {
        card.style.opacity = '0.5';
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Kalem silinemedi');
        }

        if (card) card.remove();
        await loadJobDetail(); // <-- Silinen öğeler bölümünü anında güncelle

        // deletedItems details elementini otomatik aç ki kullanıcı görsün
        const detailsElem = document.querySelector('#deletedItems details');
        if (detailsElem) detailsElem.open = true;

    } catch (error) {
        if (card) card.style.opacity = '1';
        showAlert(error.message);
    }
}

// Kalem işaretle
async function checkItem(itemId) {
    try {
        // FRONTEND GÜVENLİK: Eğer kullanıcı "Alınan" inputunu BİLEREK BOŞ bırakıp
        // direkt olarak Yeşil Tik'e basarsa, sistemin "Tamamı alındı" saymasını istiyor.
        // O yüzden tike basıldığı an, boşsa Gerekli Miktarı Alınan'a kopyalayıp sunucuya kaydedelim.
        const reqInput = document.getElementById(`req-qty-${itemId}`);
        const foundInput = document.getElementById(`found-qty-${itemId}`);

        if (reqInput && foundInput && foundInput.value.trim() === '') {
            const fullQty = reqInput.value;
            // 1. Arayüzde kutuyu hemen "Tam Liste" ile doldur ki kullanıcı içi rahat etsin
            foundInput.value = fullQty;

            // 2. Tike basılmadan hemen önce arka planda Sunucuya bu rakamı PUT et
            await fetch(`/api/jobs/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity_found: parseInt(fullQty) || 0 })
            });
        }

        // Asıl Tamamlama İsteğini Yolla
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
        showAlert('Hata: ' + error.message);
    }
}

// Split incomplete item (Quantity based)
async function splitIncompleteItem(itemId, currentQuantity) {
    document.getElementById('splitItemId').value = itemId;
    document.getElementById('splitItemMax').value = currentQuantity;
    document.getElementById('splitItemMaxLabel').textContent = `(Mevcut Miktar: ${currentQuantity})`;
    document.getElementById('splitQuantity').value = '';
    document.getElementById('splitQuantity').max = currentQuantity - 1;

    const modal = document.getElementById('splitItemModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    document.getElementById('splitQuantity').focus();
}

function closeSplitModal() {
    const modal = document.getElementById('splitItemModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Split Form Submit
document.addEventListener('DOMContentLoaded', () => {
    const splitForm = document.getElementById('splitItemForm');
    if (splitForm) {
        splitForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const itemId = document.getElementById('splitItemId').value;
            const currentQuantity = parseInt(document.getElementById('splitItemMax').value);
            const qtyStr = document.getElementById('splitQuantity').value;
            const splitQty = parseInt(qtyStr);

            if (!splitQty || isNaN(splitQty) || splitQty <= 0 || splitQty >= currentQuantity) {
                showAlert('Geçersiz miktar! 1 ile ' + (currentQuantity - 1) + ' arasında bir sayı giriniz.');
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
                closeSplitModal();
                await loadJobDetail();

            } catch (error) {
                showAlert('Hata: ' + error.message);
            }
        });
    }
});


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
        <div style="position: relative; width: 100%;">
            <div class="tag-container" onclick="document.getElementById('tag-input-${itemId}').focus()" style="display: flex; flex-wrap: nowrap; overflow-x: auto; align-items: center; gap: 4px; padding: 2px 4px; border: 2px solid var(--gray-200); border-radius: var(--radius-md); box-sizing: border-box; background: white; height: 42px; white-space: nowrap; scrollbar-width: none;">
                ${tagsHtml}
                <div style="display: flex; flex: 1; align-items: center; min-width: 140px;">
                    <input 
                        type="text" 
                        id="tag-input-${itemId}"
                        class="tag-input-field" 
                        placeholder="${tags.length > 0 ? '' : '🔍 Tedarikçi Ara/Yaz...'}"
                        autocomplete="off"
                        style="flex: 1; border: none; background: transparent; padding: 2px 4px; outline: none; font-size: 0.95rem; width: 100%; height: 100%; margin: 0;"
                        onkeydown="handleTagKeydown(event, '${itemId}')"
                        oninput="handleTagInput(event, '${itemId}')"
                        onblur="handleTagBlur('${itemId}')"
                        onfocus="handleTagInput(event, '${itemId}')"
                    >
                </div>
            </div>
            <!-- Custom Autocomplete Dropdown -->
            <div id="autocomplete-list-${itemId}" style="display: none; position: absolute; z-index: 9999; top: 100%; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); margin-top: 4px; padding: 4px;"></div>
        </div>
        <!-- Hidden input for comparison -->
        <input type="hidden" id="source-original-${itemId}" value="${currentSource || ''}">
    `;
}

// Helper to manually select from dropdown
window.selectAutocomplete = async function (itemId, value) {
    const listDiv = document.getElementById(`autocomplete-list-${itemId}`);
    if (listDiv) listDiv.style.display = 'none';

    const input = document.getElementById(`tag-input-${itemId}`);
    if (input) input.value = '';

    await addSourceTag(itemId, value, false); // Do not refocus input after click selection
};

// Manual Tag Add Button Hook
window.addTagManually = async function (itemId) {
    const input = document.getElementById(`tag-input-${itemId}`);
    if (input && input.value.trim()) {
        const val = input.value.trim();
        input.value = ''; // Temizle
        await addSourceTag(itemId, val);
    }
};

async function handleTagInput(event, itemId) {
    const input = event.target;
    const value = input.value.trim().toLowerCase();
    const listDiv = document.getElementById(`autocomplete-list-${itemId}`);

    if (!listDiv) return;

    if (!value) {
        // Option to display all if focused but empty, or just hide. Let's show all if empty on focus.
        if (event.type === 'focus' && availableSourceNames.length > 0) {
            // Show top 10
            renderAutocompleteItems(itemId, listDiv, availableSourceNames.slice(0, 10));
        } else {
            listDiv.style.display = 'none';
        }
        return;
    }

    // Filter
    const matches = availableSourceNames.filter(name => name.toLowerCase().includes(value));

    if (matches.length > 0) {
        renderAutocompleteItems(itemId, listDiv, matches);
    } else {
        listDiv.style.display = 'none';
    }
}

function renderAutocompleteItems(itemId, listDiv, matches) {
    listDiv.innerHTML = matches.map(match => `
        <div onmousedown="event.preventDefault(); window.selectAutocomplete('${itemId}', '${match.replace(/'/g, "\\'")}')" 
             style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 0.95rem; color: #4b5563; background: white; transition: all 0.2s ease;"
             onmouseover="this.style.background='#f0f9ff'; this.style.color='#0284c7';" 
             onmouseout="this.style.background='white'; this.style.color='#4b5563';">
            ${match}
        </div>
    `).join('');
    listDiv.style.display = 'block';
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
    // Hide dropdown
    setTimeout(() => {
        const listDiv = document.getElementById(`autocomplete-list-${itemId}`);
        if (listDiv) listDiv.style.display = 'none';
    }, 150);

    const input = document.getElementById(`tag-input-${itemId}`);
    if (input && input.value.trim()) {
        await addSourceTag(itemId, input.value.trim());
        input.value = '';
    }
}

async function addSourceTag(itemId, newTag, keepFocus = true) {
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
        if (keepFocus) {
            setTimeout(() => {
                const input = document.getElementById('tag-input-quick-add');
                if (input) input.focus();
            }, 50);
        }
        return;
    }

    // Missing Source Mode (Incomplete items)
    if (String(itemId).startsWith('missing-')) {
        const realItemId = String(itemId).replace('missing-', '');
        await autoSaveMissingSource(realItemId, finalSourceString);

        // UI Update (Manual)
        if (originalInput) originalInput.value = finalSourceString;
        // Find parent container to replace content
        // renderTagsInput creates a string, we need to find the container that holds this.
        // The container is likely the parent of input's parent.
        // Easier: Just replace the content of the wrapper div if we can find it.
        // renderTagsInput returns a string starting with <div class="tag-container"...
        // We can't easily query the outer container unless we wrapped it.
        // But wait, renderTagsInput is called inside a div.

        // Let's re-render the specific tag input container.
        // Note: The caller of renderTagsInput usually wraps it.
        // In renderIncompleteItem: <div style="margin-left: 24px;"> ${renderTagsInput(...)} </div>
        // It doesn't have an ID.
        // HACK: Re-load the whole job detail to be safe and consistent with other edits?
        // User said "It is getting deleted". This implies it might be re-rendering and reverting?
        // No, autoSaveMissingSource DOES NOT loadJobDetail (line 505 commented out).
        // So the UI does not change.

        // BETTER: Enable loadJobDetail() in autoSaveMissingSource OR implement local UI update.
        // Local UI update is smoother.
        // We know the input ID is `tag-input-${itemId}`. Its parent is `.tag-container`.
        // We can replace `.tag-container`'s outerHTML with the new result of renderTagsInput.

        const currentInput = document.getElementById(`tag-input-${itemId}`);
        if (currentInput) {
            const container = currentInput.closest('.tag-container');
            if (container) {
                const newHtml = renderTagsInput(itemId, finalSourceString);
                container.outerHTML = newHtml;

                // Restore focus
                if (keepFocus) {
                    setTimeout(() => {
                        const newInput = document.getElementById(`tag-input-${itemId}`);
                        if (newInput) newInput.focus();
                    }, 50);
                }
            }
        }
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

            // UI Update (Manual)
            if (originalInput) originalInput.value = finalSourceString;
            const currentInput = document.getElementById(`tag-input-${itemId}`);
            if (currentInput) {
                const container = currentInput.closest('.tag-container');
                if (container) {
                    const newHtml = renderTagsInput(itemId, finalSourceString);
                    container.outerHTML = newHtml;
                    setTimeout(() => {
                        const newInput = document.getElementById(`tag-input-${itemId}`);
                        if (newInput) newInput.focus();
                    }, 50);
                }
            }
            return;
        }

        await autoSaveSource(itemId, finalSourceString);
    }
}

// Check item (Complete) - Appended Fix
async function checkItem(itemId) {
    const itemCard = document.querySelector(`.job-item-card[data-item-id="${itemId}"]`);
    if (!itemCard) return;

    // Get input values (Reliable selection)
    const inputs = itemCard.querySelectorAll('.qty-input-field');
    const qtyInput = inputs[0]; // Required
    const receivedInput = inputs[1]; // Received

    if (!receivedInput) {
        console.error("Critical: Received input not found for item", itemId);
        return;
    }

    const required = parseInt(qtyInput.value) || 0;

    // IMPLICIT COMPLETION LOGIC
    let receivedVal = receivedInput.value;
    let received = 0;

    if (receivedVal === '' || receivedVal === null || isNaN(parseInt(receivedVal))) {
        // Empty -> Assume user implies "I got everything"
        received = required;
        // We MUST save this value to backend so 'quantity_found' is correct
        await autoSaveQuantityFound(itemId, required);
    } else {
        received = parseInt(receivedVal);
    }

    const missing = required - received;

    // Validation: If missing > 0, reason MUST be selected
    if (missing > 0) {
        // Force update received value in backend first to ensure state is consistent
        await autoSaveQuantityFound(itemId, received);

        // Check if reason is selected
        const reasonRadio = itemCard.querySelector(`input[name="missing_reason_${itemId}"]:checked`);

        if (!reasonRadio) {
            // Check if warning section is even visible
            const warningSection = itemCard.querySelector(`input[name^="missing_reason_"]`);
            if (!warningSection) {
                // Force reload to show the missing UI
                await loadJobDetail(); // Reload to render warning
                return;
            }

            showAlert('⚠️ Eksik miktar var! Lütfen aşağıdan "Başka yerden alınacak" veya "Daha sonra" seçeneğini işaretleyin.');
            return;
        }
    }

    try {
        const response = await fetch(`/api/jobs/items/${itemId}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('İşlem başarısız');
        await loadJobDetail();

    } catch (error) {
        console.error(error);
        showAlert(error.message);
    }
}

// Resolve missing item (Set found = quantity)
async function resolveMissingItem(itemId) {
    const itemCard = document.querySelector(`.job-item-card[data-item-id="${itemId}"]`);
    if (!itemCard) return;

    const qtyInput = itemCard.querySelectorAll('.qty-input-field')[0];
    const receivedInput = itemCard.querySelectorAll('.qty-input-field')[1];

    if (qtyInput && receivedInput) {
        receivedInput.value = qtyInput.value;
        await autoSaveQuantityFound(itemId, qtyInput.value);
        await checkItem(itemId); // Finalize
    }
}
