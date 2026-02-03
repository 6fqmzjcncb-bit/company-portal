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

// Kalemleri render et (tek düz list, kaynak her item'da gösterilir)
function renderItems(items) {
    const container = document.getElementById('groupedItems');

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Henüz kalem eklenmemiş</p>';
        return;
    }

    container.innerHTML = items.map(item => {
        const productName = item.product ? item.product.name : item.custom_name;
        const sourceName = item.source ? item.source.name : '';
        const isChecked = item.is_checked;

        return `
            <div class="item-row ${isChecked ? 'item-checked' : ''}" data-item-id="${item.id}">
                <div class="item-checkbox">
                    ${isChecked ? '✓' : '☐'}
                </div>
                <div class="item-details">
                    <div class="item-name"><strong>${productName}</strong></div>
                    ${!isChecked ? `
                        <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                            <input 
                                type="number" 
                                class="input-small" 
                                style="width: 80px;"
                                value="${item.quantity}" 
                                min="1"
                                onblur="autoSaveQuantity(${item.id}, this.value)"
                                placeholder="Miktar">
                            <span>adet</span>
                            <span style="color: #888;">•</span>
                            <input 
                                type="text" 
                                class="input-small" 
                                style="width: 250px;"
                                value="${sourceName}"
                                list="sourceList"
                                onblur="autoSaveSource(${item.id}, this.value)"
                                placeholder="Kaynak (ör: Koçtaş, Merkez Depo)">
                        </div>
                    ` : `
                        <div class="item-quantity">${item.quantity} adet • 📦 ${sourceName}</div>
                        <div class="item-meta">Hazır (${item.checkedBy?.full_name || 'Bilinmiyor'}, ${new Date(item.checked_at).toLocaleString('tr-TR')})</div>
                    `}
                </div>
                <div class="item-actions">
                    ${!isChecked ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">🗑️ Sil</button>
                        <button class="btn btn-sm btn-success" onclick="checkItem(${item.id})">☑️ Alındı</button>
                    ` : `
                        <button class="btn btn-sm btn-warning" onclick="uncheckItem(${item.id})">↩️ Geri Al</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
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
        const response = await fetch(`/api/jobs/items/${itemId}`, {
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
                    const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
                    const products = await response.json();

                    const resultsContainer = document.getElementById('inlineProductResults');

                    if (products.length === 0) {
                        resultsContainer.innerHTML = '<div class="no-results">Ürün bulunamadı</div>';
                        return;
                    }

                    resultsContainer.innerHTML = `
                        <div class="autocomplete-results">
                            ${products.map(p => `
                                <div class="autocomplete-item" onclick="selectInlineProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
                                    <strong>${p.name}</strong>
                                    ${p.barcode ? `<span>${p.barcode}</span>` : ''}
                                    ${currentUser && currentUser.role === 'admin' ? `<span>Stok: ${p.current_stock}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
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
                const response = await fetch(`/api/jobs/${jobId}/items`, {
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
