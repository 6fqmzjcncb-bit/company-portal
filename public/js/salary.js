// Auth check
let currentUser = null;
let allEmployees = [];

async function checkAuth() {
    // 1. Try to load from cache immediately
    const cachedUser = localStorage.getItem('user_cache');
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            updateUserInterface(user);
            currentUser = user; // Set global for other functions
        } catch (e) {
            console.error('Cache parse error', e);
        }
    }

    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            localStorage.removeItem('user_cache');
            window.location.href = '/index.html';
            return null;
        }
        const user = await response.json();

        // 2. Update cache and UI
        localStorage.setItem('user_cache', JSON.stringify(user));
        updateUserInterface(user);
        currentUser = user; // Update global

        return user;
    } catch (error) {
        if (!cachedUser) {
            window.location.href = '/index.html';
        }
        return currentUser; // Return cached if available on error (offline mode?)
    }
}

function updateUserInterface(user) {
    if (!user) return;

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const adminLink = document.getElementById('adminLink');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (user.role === 'admin' && adminLink) {
        adminLink.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentUser) return;

    // Set default date for transaction
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transDate').value = today;

    await loadData();
});

async function logout() {
    try {
        localStorage.removeItem('user_cache');
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

async function loadData() {
    await loadBalances();
    await loadHistory();
    await loadSources(); // Load payment sources
}

async function loadSources() {
    try {
        const response = await fetch('/api/payment-accounts');
        if (!response.ok) throw new Error('Hesaplar yüklenemedi');

        const accounts = await response.json();
        const select = document.getElementById('accountSelect');

        // Keep the first option (placeholder)
        select.innerHTML = '<option value="">Seçiniz...</option>';

        accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.name;
            // Use stored icon or default based on type
            const icon = acc.icon || (acc.type === 'bank' ? '🏦' : '💵');
            opt.textContent = `${icon} ${acc.name}`;
            select.appendChild(opt);
        });

    } catch (error) {
        console.error('Hesap yükleme hatası:', error);
    }
}

// --------------------------------------------------------------------------
// EMPLOYEE CRUD SECTION
// --------------------------------------------------------------------------

async function showAddEmployeeModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('editEmpId').value = '';
    document.getElementById('empModalTitle').textContent = 'Yeni Personel Ekle';
    document.getElementById('btnDeleteEmployee').style.display = 'none'; // Hide delete for new

    // Load System Roles
    await loadSystemRoles();

    // Force select 'Personel' by default
    const select = document.getElementById('systemRole');
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text.includes('Personel')) {
            select.selectedIndex = i;
            break;
        }
    }

    document.getElementById('employeeModal').style.display = 'flex';
}

// function editEmployee(id) {
//     const emp = allEmployees.find(e => e.id === id);
//     if (!emp) return;

function editEmployee(id) {
    // Removed early return to allow editing archived employees by fetching them

    document.getElementById('empModalTitle').textContent = 'Personel Düzenle';
    document.getElementById('btnDeleteEmployee').style.display = 'block';
    document.getElementById('btnDeleteEmployee').onclick = () => deleteEmployee(id);

    // clear fields or show loading
    document.getElementById('fullName').value = 'Yükleniyor...';
    document.getElementById('phone').value = '';
    document.getElementById('dailyWage').value = '';
    document.getElementById('monthlySalary').value = '';
    document.getElementById('hireDate').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('editEmpId').value = id;

    // Fetch full employee details
    fetch(`/api/employees/${id}`).then(res => res.json()).then(fullEmp => {
        document.getElementById('fullName').value = fullEmp.full_name;
        document.getElementById('phone').value = fullEmp.phone || '';

        // Load roles and set selected
        loadSystemRoles().then(() => {
            if (fullEmp.user && fullEmp.user.role_id) {
                document.getElementById('systemRole').value = fullEmp.user.role_id;
            }
        });

        document.getElementById('dailyWage').value = fullEmp.daily_wage || '';
        document.getElementById('monthlySalary').value = fullEmp.monthly_salary || '';
        document.getElementById('hireDate').value = fullEmp.hire_date ? fullEmp.hire_date.split('T')[0] : '';
        document.getElementById('notes').value = fullEmp.notes || '';

        // Button Logic: Fire vs Re-hire
        const balanceText = document.getElementById('modalBalance');
        if (balanceText) {
            balanceText.innerText = `Toplam Ödenecek: ${formatCurrency(total)}`;
            // Auto-update amount input
            const amountInput = document.getElementById('transAmount');
            if (amountInput) {
                // Using toLocaleString for formatting
                amountInput.value = total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
        const btnDelete = document.getElementById('btnDeleteEmployee');
        if (fullEmp.is_active) {
            btnDelete.innerText = 'İşten Çıkar (Arşivle)';
            btnDelete.className = 'btn btn-danger';
            btnDelete.onclick = () => deleteEmployee(id);
            btnDelete.style.display = 'block';
        } else {
            btnDelete.innerText = 'İşe Geri Al (Aktifleştir)';
            btnDelete.className = 'btn btn-success';
            btnDelete.onclick = () => reactivateFromEdit(id);
            btnDelete.style.display = 'block';
        }

        document.getElementById('employeeModal').style.display = 'flex';
    }).catch(err => {
        console.error(err);
        showToast('Hata', 'Personel detayı yüklenemedi', 'error');
    });
}


async function reactivateEmployee(id) {
    if (!confirm('Bu personeli tekrar işe almak istediğinize emin misiniz?')) return;

    try {
        const response = await fetch(`/api/employees/${id}/reactivate`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('İşlem başarısız');

        showToast('Başarılı', 'Personel tekrar aktif edildi.', 'success');
        closeModal('employeeModal');
        await loadData();
    } catch (error) {
        console.error(error);
        showToast('Hata', 'Personel aktif edilemedi.', 'error');
    }
}

// Event Listener for Employee Form
document.addEventListener('DOMContentLoaded', () => {
    // Other listeners moved to init...
    const btnSave = document.getElementById('btnSaveEmployeeSalary');
    if (btnSave) {
        btnSave.addEventListener('click', handleEmployeeSubmit);
        console.log('Save button listener attached');
    }

    // Inject Toast CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            background: #fff;
            color: #333;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            transform: translateX(120%);
            transition: transform 0.3s ease-out;
            font-family: 'Inter', sans-serif;
            border-left: 4px solid #3b82f6;
        }
        .toast.success { border-left-color: #10b981; }
        .toast.error { border-left-color: #ef4444; }
        .toast.visible { transform: translateX(0); }
        .toast-icon { font-size: 1.2rem; }
        .toast-content { display: flex; flex-direction: column; }
        .toast-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; }
        .toast-message { font-size: 0.85rem; color: #64748b; }
    `;
    document.head.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
});

// Custom Toast Notification
window.showToast = function (title, message, type = 'info') {
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('visible'));

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Replace standard alerts (optional wrapper)
window.showAlert = function (msg) {
    showToast('Bilgi', msg, 'info');
}


async function handleEmployeeSubmit(e) {
    e.preventDefault();
    console.log('Saving employee...');

    const btn = document.getElementById('btnSaveEmployeeSalary');
    const originalText = btn.innerText;

    // Validation
    const fullName = document.getElementById('fullName').value;
    // Role removed, handled by backend/systemRole

    if (!fullName) {
        showToast('Hata', 'Lütfen Ad Soyad alanını doldurun.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'İşleniyor...';

    const id = document.getElementById('editEmpId').value;
    const data = {
        full_name: fullName,
        phone: document.getElementById('phone').value,
        // role: role, // Removed
        daily_wage: document.getElementById('dailyWage').value || null,
        monthly_salary: document.getElementById('monthlySalary').value || null,
        hire_date: document.getElementById('hireDate').value || null,
        notes: document.getElementById('notes').value,
        role_id: document.getElementById('systemRole').value || null, // Add system role
        is_active: true
    };

    try {
        const url = id ? `/api/employees/${id}` : '/api/employees';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        let result;
        try {
            result = await response.json();
        } catch (e) {
            console.error('JSON Parse Error', e);
            throw new Error('Sunucudan geçersiz yanıt alındı (' + response.status + ')');
        }

        if (!response.ok) {
            throw new Error(result.error || result.message || 'İşlem başarısız');
        }

        // Check for created user credentials to show
        if (result.createdUser) {
            // Show Custom Credential Modal
            document.getElementById('credUsername').textContent = result.createdUser.username;
            document.getElementById('credPassword').textContent = result.createdUser.password;

            const credModal = document.getElementById('credentialModal');
            if (credModal) {
                credModal.style.display = 'flex';
            } else {
                // Fallback just in case
                alert(`Kullanıcı: ${result.createdUser.username}\nŞifre: ${result.createdUser.password}`);
            }

        } else {
            showToast('Başarılı', 'Personel başarıyla kaydedildi.', 'success');
        }

        closeModal('employeeModal');
        await loadData(); // Reload table

    } catch (error) {
        console.error(error);
        showToast('İşlem Başarısız', error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}
// document.getElementById('employeeForm').addEventListener('submit', handleEmployeeSubmit); // REMOVED


// --------------------------------------------------------------------------
// UPDATED LOAD BALANCES
// --------------------------------------------------------------------------

// Revert loadBalances
async function loadBalances() {
    try {
        console.log('Veri yükleniyor...');
        const response = await fetch('/api/salary/balance'); // No query param loops

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Sunucu Hatası: ${response.status} - ${errText}`);
        }

        const balances = await response.json();

        // Save for modal lookup (only active ones ideally, but backend defaults to active now if no param? 
        // Wait, logic in backend: "whereClause = showArchived ? {} : { is_active: true }"
        // So plain fetch gets active only. Good.
        allEmployees = balances;
        updateEmployeeSelect();

        const tbody = document.getElementById('balanceTable');

        if (balances.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Personel bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = balances.map(createEmployeeRow).join('');
    } catch (error) {
        console.error('Bakiye yükleme hatası:', error);
        document.getElementById('balanceTable').innerHTML =
            `<tr><td colspan="9" class="text-center text-danger">⚠️ Veri yüklenemedi: ${error.message}<br><button onclick="loadBalances()" class="btn-small btn-secondary mt-2">Tekrar Dene</button></td></tr>`;
    }
}

// Helper to avoid duplication
function createEmployeeRow(emp) {
    const balanceClass = emp.current_balance > 0 ? 'text-danger' : 'text-success';
    const wageDisplay = emp.daily_wage > 0
        ? formatCurrency(emp.daily_wage)
        : (emp.monthly_salary > 0
            ? formatCurrency(emp.monthly_salary) + ' (Ay)'
            : '-');

    return `
    <tr>
        <td>
            <div class="clickable-name" onclick="editEmployee(${emp.id})" title="Detayları Düzenle">
                ${emp.full_name} ✏️
            </div>
        </td>
        <td>${wageDisplay}</td>
        <td><small>${formatDate(emp.start_date)}</small></td>
        <td>${emp.total_worked_days}</td>
        <td>${formatCurrency(emp.total_accrued)}</td>
        <td style="width: 120px;">
            <div style="display: flex; align-items: center; border: 1px solid #ced4da; border-radius: 4px; padding: 0 8px; background: #fff; height: 32px;">
                <input type="text" 
                    style="border: none; outline: none; width: 100%; text-align: right; padding: 0; font-size: 1rem; background: transparent;" 
                    value="${(emp.total_reimbursement || 0) === 0 ? '' : (emp.total_reimbursement || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"
                    placeholder="0,00"
                    data-original-value="${(emp.total_reimbursement || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"
                    onblur="formatCurrencyInput(this)"
                    onchange="handleSmartReimbursement(${emp.id}, this)">
                <span style="font-size: 12px; color: #888; margin-left: 4px; font-weight: 500;">TL</span>
            </div>
        </td>
        <td>${formatCurrency(emp.total_paid + emp.total_expense)}</td>
        <td><strong class="${balanceClass}">${formatCurrency(emp.current_balance)}</strong></td>
        <td>
            <button class="btn btn-success btn-sm" onclick="openPaymentModal('${emp.id}')">
                Ödeme Yap
            </button>
        </td>
    </tr>
    `;
}

// Archived Modal Logic
function openArchivedModal() {
    document.getElementById('archivedEmployeesModal').style.display = 'flex';
    loadArchivedEmployees();
}

// Custom Confirm Modal Helper
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;

    const btnYes = document.getElementById('btnConfirmPrimary');
    const btnNo = document.getElementById('btnConfirmCancel');

    // Reset clones to remove old listeners
    const newBtnYes = btnYes.cloneNode(true);
    const newBtnNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);

    newBtnYes.onclick = () => {
        modal.style.display = 'none';
        onConfirm();
    };

    newBtnNo.onclick = () => {
        modal.style.display = 'none';
    };

    // Close on outside click
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    modal.style.display = 'flex';
}

async function deleteEmployee(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    // Check balance if positive
    if (emp.current_balance > 0) {
        showConfirmModal(
            'Bakiye Uyarısı',
            `Bu personelin ${formatCurrency(emp.current_balance)} içeride alacağı görünüyor.\n\nTüm alacağını ÖDEYİP işten çıkarmak (Sıfırlayıp Arşivlemek) ister misiniz?\n\n(İptal derseniz bakiye ile birlikte arşivlenir, Evet derseniz ödeme yapılıp arşivlenir.)`,
            async () => {
                await settleAndArchive(id, emp.current_balance);
            }
        );
        return;
    }

    showConfirmModal(
        'İşten Çıkarma',
        'Bu personeli işten çıkarmak istediğinize emin misiniz? Bu işlem personeli arşivleyecektir.',
        async () => {
            try {
                const response = await fetch(`/api/employees/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('İşlem başarısız');
                }

                showToast('Başarılı', 'Personel işten çıkarıldı (Arşivlendi).', 'success');
                closeModal('employeeModal');
                await loadData();
            } catch (error) {
                console.error(error);
                showToast('Hata', 'Personel silinemedi.', 'error');
            }
        }
    );
}

// ... existing code ...

function showTransactionModal() {
    try {
        editingTransactionId = null; // Clear editing state
        document.getElementById('transactionModalTitle').innerText = 'Yeni İşlem Ekle';
        const form = document.getElementById('transactionForm');
        if (form) form.reset();

        const empIdInput = document.getElementById('employeeId');
        if (empIdInput) empIdInput.value = '';

        // Set Default Date
        const dateInput = document.getElementById('transDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        document.getElementById('transactionModal').style.display = 'flex';
    } catch (e) {
        console.error('Modal Error:', e);
        showAlert('Hata: Modal açılamadı. ' + e.message);
    }
}

function openPaymentModal(empId) {
    try {
        showTransactionModal();
        document.getElementById('employeeSelect').value = empId;

        const payRadio = document.querySelector('input[name="transType"][value="payment"]');
        if (payRadio) payRadio.checked = true;

        updateEmployeeContext();
        toggleAccountSelect();
    } catch (e) {
        console.error('Payment Modal Error:', e);
        showAlert('Hata: Ödeme penceresi açılamadı. ' + e.message);
    }
}

function openExpenseModal(empId) {
    try {
        showTransactionModal();
        document.getElementById('employeeSelect').value = empId;

        const expRadio = document.querySelector('input[name="transType"][value="expense"]');
        if (expRadio) expRadio.checked = true;

        updateEmployeeContext();
        toggleAccountSelect();
    } catch (e) {
        console.error('Expense Modal Error:', e);
    }
}

async function reactivateFromEdit(id) {
    // Check if daily wage or monthly salary is entered, at least one is required? 
    // Or if they exist from previous data (fetched in edit modal), we assume fine.
    // The user said "remove warning", so we proceed directly.

    const dailyWage = document.getElementById('dailyWage').value;
    const monthlySalary = document.getElementById('monthlySalary').value;
    const roleId = document.getElementById('systemRole').value;

    const payload = {};
    if (dailyWage) payload.daily_wage = dailyWage;
    if (monthlySalary) payload.monthly_salary = monthlySalary;

    // Also update role if needed, though reactivate might not handle it directly unless we modify backend.
    // The backend reactivate endpoint currently ONLY updates is_active, termination_date, start_date and wages.
    // It does not update role_id. 
    // However, the user might have changed role in the edit modal.
    // Ideally we should SAVE first then REACTIVATE, or REACTIVATE then save?
    // Let's do: Reactivate first with wages, then if successful, trigger a standard update separately if needed?
    // Actually, `submitRehire` (the old one) only did wages.
    // But since we are in the "Edit" modal, the user expects EVERYTHING to be saved (Name, Phone, etc).

    // BETTER APPROACH: 
    // 1. Reactivate the employee (sets is_active=true)
    // 2. Call the standard "Save" logic to update all fields (Name, Phone, Role, Notes)

    try {
        // 1. Reactivate
        const res = await fetch(`/api/employees/${id}/reactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Aktifleştirme başarısız');

        // 2. Update other details (Name, Phone, Role...) by triggering the Save button click or calling save logic?
        // Let's manually trigger the update endpoint to be safe.
        // Or simply: just call `saveEmployee`? `saveEmployee` uses `editEmpId`.
        // If we call `saveEmployee`, it sends a PUT request.
        // Does PUT work on inactive employees? Yes.
        // Does PUT work on active employees? Yes.
        // So we can just call `saveEmployee()`.

        // Wait, `saveEmployee` refreshes the page/modal.
        // So let's chain them.

        showToast('Başarılı', 'Personel aktif edildi, bilgiler güncelleniyor...', 'success');

        // Trigger generic save to ensure name/phone/role updates are applied
        // We can just click the save button programmatically?
        // document.getElementById('btnSaveEmployeeSalary').click(); 
        // But `btnSaveEmployeeSalary` creates a NEW employee if no ID involves? 
        // No, `saveEmployee` checks `editEmpId`.

        await handleEmployeeSubmit({ preventDefault: () => { } }); // reusing existing logic
        closeModal('archivedEmployeesModal');

        // Modal closing is handled by saveEmployee if successful.

    } catch (error) {
        console.error(error);
        showToast('Hata', 'İşlem sırasında bir sorun oluştu', 'error');
    }
}

// Replaces reactivateEmployee with Modal open
async function openRehireModal(id) {
    document.getElementById('rehireEmpId').value = id;
    document.getElementById('rehireDailyWage').value = '';
    document.getElementById('rehireMonthlySalary').value = '';

    // Fetch latest details to show "Old Info"
    try {
        const res = await fetch(`/api/employees/${id}`);
        const emp = await res.json();

        const oldInfoHtml = `
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 0.9rem;">
                <strong>Mevcut Kayıtlı Bilgiler:</strong>
                <ul style="margin: 5px 0 0 15px; color: #555;">
                    <li>Günlük: ${emp.daily_wage ? formatCurrency(emp.daily_wage) : '-'}</li>
                    <li>Aylık: ${emp.monthly_salary ? formatCurrency(emp.monthly_salary) : '-'}</li>
                    <li>Görevi: ${emp.role_id ? 'Sistemde Tanımlı' : (emp.role || 'Personel')}</li>
                     <li>Ayrılma Tarihi: ${emp.termination_date ? formatDate(emp.termination_date) : '-'}</li>
                </ul>
            </div>
        `;

        const infoContainer = document.getElementById('rehireOldInfo');
        if (infoContainer) infoContainer.innerHTML = oldInfoHtml;

        // Also update placeholders
        document.getElementById('rehireDailyWage').placeholder = emp.daily_wage || 'Yeni Tutar';
        document.getElementById('rehireMonthlySalary').placeholder = emp.monthly_salary || 'Yeni Tutar';

    } catch (e) {
        console.error('Rehire info fetch error', e);
    }

    document.getElementById('rehireModal').style.display = 'flex';
}

async function submitRehire() {
    const id = document.getElementById('rehireEmpId').value;
    const dailyWage = document.getElementById('rehireDailyWage').value;
    const monthlySalary = document.getElementById('rehireMonthlySalary').value;

    if (!dailyWage && !monthlySalary && !confirm('Ücret girmeden devam etmek istiyor musunuz? (Ücretsiz görünecek)')) {
        return;
    }

    try {
        const response = await fetch(`/api/employees/${id}/reactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                daily_wage: dailyWage || null,
                monthly_salary: monthlySalary || null
            })
        });

        if (!response.ok) throw new Error('İşlem başarısız');

        showToast('Başarılı', 'Personel yeni ücretle tekrar aktif edildi.', 'success');
        closeModal('rehireModal');
        closeModal('employeeModal'); // If open
        await loadData(); // Reload main data

        // Refresh archive modal if open
        if (document.getElementById('archivedEmployeesModal').style.display === 'flex') {
            loadArchivedEmployees();
        }

    } catch (error) {
        console.error(error);
        showToast('Hata', 'Personel aktif edilemedi.', 'error');
    }
}

async function settleAndArchive(id, amount) {
    try {
        showToast('Bilgi', 'Bakiye ödemesi yapılıyor...', 'info');

        // 1. Pay
        const payResponse = await fetch('/api/salary/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: id,
                amount_paid: amount,
                transaction_type: 'payment',
                account: 'cash', // Default to cash
                notes: 'İşten çıkış final ödemesi (Otomatik)',
                payment_date: new Date().toISOString().split('T')[0]
            })
        });

        if (!payResponse.ok) throw new Error('Ödeme işlemi başarısız oldu.');

        // 2. Archive
        const deleteResponse = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) throw new Error('Arşivleme işlemi başarısız oldu.');

        showToast('Tamamlandı', 'Tüm alacaklar ödendi ve personel arşivlendi.', 'success');
        closeModal('employeeModal');
        await loadData();

    } catch (error) {
        console.error(error);
        showToast('Hata', error.message, 'error');
    }
}

async function loadArchivedEmployees() {
    // Use grid
    const grid = document.getElementById('archivedEmployeesGrid');
    const loading = document.getElementById('archivedLoading');
    const empty = document.getElementById('archivedEmpty');

    grid.innerHTML = '';
    loading.style.display = 'block';
    empty.style.display = 'none';

    try {
        console.log('Arşiv yükleniyor...');
        const response = await fetch('/api/salary/balance?showArchived=true');
        const all = await response.json();

        // Filter: is_active should be false (or 0)
        const archived = all.filter(e => e.is_active === false || e.is_active === 0);
        console.log('Arşivlenenler:', archived);

        loading.style.display = 'none';

        if (archived.length === 0) {
            empty.style.display = 'block';
            return;
        }

        grid.innerHTML = archived.map(emp => {
            // Wage Display Logic: Show both if exist, or just one, or '-'
            let wageInfo = '';
            const daily = emp.daily_wage ? `${formatCurrency(emp.daily_wage)} (Günlük)` : '';
            const monthly = emp.monthly_salary ? `${formatCurrency(emp.monthly_salary)} (Aylık)` : '';

            if (daily && monthly) {
                wageInfo = `<div>${daily}</div><div>${monthly}</div>`;
            } else if (daily) {
                wageInfo = daily;
            } else if (monthly) {
                wageInfo = monthly;
            } else {
                wageInfo = '-';
            }

            // Dates
            const startDate = formatDate(emp.start_date);
            const terminationDate = emp.termination_date ? formatDate(emp.termination_date) : '-';

            return `
            <div class="archive-card">
                <div class="archive-header">
                    <span class="archive-name">${emp.full_name}</span>
                    <span class="badge badge-secondary">Pasif</span>
                </div>
                
                <div class="archive-details">
                    <div class="archive-detail-item">
                        <span class="archive-label">İşe Giriş</span>
                        <span class="archive-value">${startDate}</span>
                    </div>
                     <div class="archive-detail-item text-right">
                         <span class="archive-label">Ayrılma Tarihi</span>
                        <span class="archive-value">${terminationDate}</span> 
                    </div>
                </div>

                <div class="archive-details" style="margin-top: 8px;">
                    <div class="archive-detail-item">
                        <span class="archive-label">Ücret Bilgisi</span>
                        <span class="archive-value">${wageInfo}</span>
                    </div>
                     <div class="archive-detail-item text-right">
                        <span class="archive-label">Toplam Çalışma</span>
                        <span class="archive-value">${emp.total_worked_days} Gün</span>
                    </div>
                </div>
                
                <div class="archive-actions" style="display: flex; gap: 8px;">
                    <button class="btn btn-success btn-sm" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px;" onclick="editEmployee(${emp.id})">
                        <span>📋</span> İşe Geri Al
                    </button>
                </div>
            </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Arşiv yükleme hatası:', e);
        loading.style.display = 'none';
        grid.innerHTML = '<div class="text-danger text-center">Hata: ' + e.message + '</div>';
    }
}
// Placeholder for now - Need to update backend first to return is_active?
// Or just update frontend assuming I will update backend next.


async function loadHistory() {
    try {
        const response = await fetch('/api/salary/payments');
        if (!response.ok) throw new Error('Veri alınamadı');

        const transactions = await response.json();

        const tbody = document.getElementById('transactionHistory');

        // Filter out 'reimbursement' (Harcama) transactions as requested
        const filteredTransactions = transactions.filter(t => t.transaction_type !== 'reimbursement');

        if (!filteredTransactions || filteredTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Kayıt bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = filteredTransactions.map(t => {
            const empName = t.employee ? t.employee.full_name : 'Silinmiş Personel';
            const typeLabels = {
                'payment': '<span class="badge badge-success">Ödeme</span>',
                'expense': '<span class="badge badge-warning">Kesinti</span>',
                'reimbursement': '<span class="badge badge-info">Masraf Fişi</span>'
            };

            const daysBadge = t.days_worked > 0
                ? `<span class="badge badge-secondary">${t.days_worked} Gün</span>`
                : '-';

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td>${formatDate(t.payment_date)}</td>
                <td>${daysBadge}</td>
                <td>${typeLabels[t.transaction_type] || t.transaction_type}</td>
                <td>${formatCurrency(t.amount_paid)}</td>
                <td>${getAccountLabel(t.account)}</td>
                <td>${t.notes || '-'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick='editTransaction(${JSON.stringify(t).replace(/'/g, "&apos;")})'>Düzenle</button>
                </td>
            </tr>
            `;
        }).join('');


    } catch (error) {
        console.error('Geçmiş hatası:', error);
        document.getElementById('transactionHistory').innerHTML = '<tr><td colspan="6" class="text-center text-danger">Yükleme hatası</td></tr>';
    }
}

// Modal Logic

function showTransactionModal() {
    try {
        editingTransactionId = null; // Clear editing state
        document.getElementById('transactionModalTitle').innerText = 'Yeni İşlem Ekle';
        const form = document.getElementById('transactionForm');
        if (form) form.reset();

        const empIdInput = document.getElementById('employeeId');
        if (empIdInput) empIdInput.value = '';

        // Set Default Date
        const dateInput = document.getElementById('transDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        document.getElementById('transactionModal').style.display = 'flex';

        // Hide delete button for new transaction
        const btnDelete = document.getElementById('btnDeleteData');
        if (btnDelete) btnDelete.style.display = 'none';

    } catch (e) {
        console.error('Modal Error:', e);
        showAlert('Hata: Modal açılamadı. ' + e.message);
    }
}

function openPaymentModal(empId) {
    try {
        showTransactionModal();
        document.getElementById('employeeSelect').value = empId;

        const payRadio = document.querySelector('input[name="transType"][value="payment"]');
        if (payRadio) payRadio.checked = true;

        updateEmployeeContext();
        toggleAccountSelect();

        // Default to 'Merkez Kasa'
        const accSelect = document.getElementById('accountSelect');
        if (accSelect) {
            // Try explicit value or find option with text
            accSelect.value = 'Merkez Kasa';
            // If value doesn't match (e.g. if values are IDs), we might need to find by text.
            // But based on loadSources, value IS name.
        }
    } catch (e) {
        console.error('Payment Modal Error:', e);
        showAlert('Hata: Ödeme penceresi açılamadı. ' + e.message);
    }
}

function openExpenseModal(empId) {
    try {
        showTransactionModal();
        document.getElementById('employeeSelect').value = empId;

        const expRadio = document.querySelector('input[name="transType"][value="expense"]');
        if (expRadio) expRadio.checked = true;

        updateEmployeeContext();
        toggleAccountSelect();
    } catch (e) {
        console.error('Expense Modal Error:', e);
    }
}


function updateEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    if (select.options.length <= 1) { // Only fill if empty
        allEmployees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.full_name;
            select.appendChild(opt);
        });
    }
}

function updateEmployeeContext() {
    const empId = document.getElementById('employeeSelect').value;
    const summaryDiv = document.getElementById('financialSummary');

    if (empId) {
        const emp = allEmployees.find(e => e.id == empId);
        if (emp) {
            // Populate financial summary
            document.getElementById('modalAccrued').textContent = formatCurrency(emp.total_accrued);
            document.getElementById('modalReimbursement').textContent = formatCurrency(emp.total_reimbursement || 0);
            document.getElementById('modalExpense').textContent = formatCurrency(emp.total_expense);
            document.getElementById('modalPaid').textContent = formatCurrency(emp.total_paid);
            document.getElementById('modalBalance').textContent = formatCurrency(emp.current_balance);

            summaryDiv.classList.remove('hidden');
        } else {
            summaryDiv.classList.add('hidden');
        }
    } else {
        summaryDiv.classList.add('hidden');
    }
}

function toggleAccountSelect() {
    const checkedRadio = document.querySelector('input[name="transType"]:checked');
    if (!checkedRadio) return;

    const type = checkedRadio.value;
    const accountGroup = document.getElementById('accountGroup');
    // Account selection is only needed for actual Money OUT (Payment)
    accountGroup.style.display = (type === 'payment') ? 'block' : 'none';
}

// Form Submission
// Currency Formatter Input
window.formatCurrencyInput = function (input) {
    let value = input.value;
    if (!value) return;

    // Remove existing dots (thousands separators)
    // Replace comma with dot for parsing
    let cleanVal = value.replace(/\./g, '').replace(',', '.');
    let numberValue = parseFloat(cleanVal);

    if (isNaN(numberValue)) {
        // If invalid, maybe just leave it or clear? 
        // Let's leave it to let user see error or correct it.
        return;
    }

    // Format: 1.000,00
    input.value = numberValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to parse formatted currency back to float
function parseCurrencyInput(value) {
    if (!value) return 0;
    // Remove dots (thousands), replace comma with dot (decimal)
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

// Form Submission
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const empId = document.getElementById('employeeSelect').value;
    const amountVal = document.getElementById('transAmount').value;
    const amount = parseCurrencyInput(amountVal); // Parse formatted input
    const account = document.getElementById('accountSelect').value;
    const date = document.getElementById('transDate').value;
    const notes = document.getElementById('transNotes').value;

    try {
        let url = '/api/salary/pay';
        let method = 'POST';
        const body = {
            employee_id: empId,
            amount_paid: amount,
            transaction_type: 'payment',
            account: account,
            payment_date: date,
            notes: notes
        };

        // Handle "Include Today" logic
        const includeToday = document.getElementById('includeToday').checked;
        const isPayment = document.querySelector('input[name="transType"]:checked').value === 'payment';

        if (isPayment && includeToday && !editingTransactionId) {
            try {
                // Create attendance record first
                const today = new Date().toISOString().split('T')[0];
                await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employee_id: empId,
                        date: today,
                        worked: true,
                        hours_worked: 1, // Default to 1 day/shift
                        notes: 'Ödeme sırasında otomatik oluşturuldu'
                    })
                });

                // Add note to payment
                body.notes = (body.notes ? body.notes + ' - ' : '') + 'Bugün çalışıldı (+1)';
            } catch (attError) {
                console.error('Otomatik katılım oluşturma hatası', attError);
                // Continue with payment but warn? Or just proceed.
            }
        }

        if (editingTransactionId) {
            url = `/api/salary/${editingTransactionId}`;
            method = 'PUT';
            // For updates, we might want to respect the original transaction type if we supported editing expenses
            // But the modal currently forces 'payment' in hidden logic or defaulting?
            // Actually the modal has radio buttons for type? 
            // In openPaymentModal it checks 'payment'.
            // In editTransaction we set the radio button.
            // So we should read the radio button value.
            const type = document.querySelector('input[name="transType"]:checked').value;
            body.transaction_type = type;
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Kaydedilemedi');

        showAlert('İşlem başarıyla kaydedildi');
        closeModal('transactionModal');
        loadData(); // Refresh all tables

    } catch (error) {
        showAlert('Hata: ' + error.message);
    }
});

// Transaction Edit/Delete (Restored)
window.editTransaction = function (t) {
    try {
        editingTransactionId = t.id;
        document.getElementById('transactionModalTitle').innerText = 'İşlem Düzenle';

        // Populate Form
        document.getElementById('employeeSelect').value = t.employee_id;
        document.getElementById('transAmount').value = t.amount_paid;
        document.getElementById('transDate').value = t.payment_date.split('T')[0];
        document.getElementById('transNotes').value = t.notes || '';
        document.getElementById('accountSelect').value = t.account;

        // Set Access
        const rad = document.querySelector(`input[name="transType"][value="${t.transaction_type}"]`);
        if (rad) rad.checked = true;

        updateEmployeeContext();
        toggleAccountSelect();

        updateEmployeeContext();
        toggleAccountSelect();

        document.getElementById('transactionModal').style.display = 'flex';

        // Show delete button
        const btnDelete = document.getElementById('btnDeleteData');
        if (btnDelete) {
            btnDelete.style.display = 'block';
        }

    } catch (e) {
        console.error('Edit Error', e);
        showAlert('Hata: Düzenleme ekranı açılamadı');
    }
};





window.handleSmartReimbursement = async function (empId, input) {
    const newValue = parseCurrencyInput(input.value);
    const originalValue = parseCurrencyInput(input.getAttribute('data-original-value'));
    const diff = newValue - originalValue;

    if (diff === 0) return; // No change

    // Confirmation removed as requested
    // if (!confirm(...)) return;

    try {
        const response = await fetch('/api/salary/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: empId,
                amount_paid: diff, // Allow negative to reduce total
                transaction_type: 'reimbursement', // Masraf Fişi
                account: 'cash',
                notes: `Hızlı Harcama Düzenlemesi (${diff > 0 ? '+' : ''}${formatCurrency(diff)})`,
                payment_date: new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) throw new Error('Kaydedilemedi');

        showToast('Başarılı', 'Masraf işlendi', 'success');
        input.blur();
        await loadData(); // Refresh history and balances
    } catch (e) {
        console.error(e);
        showToast('Hata', 'İşlem başarısız', 'error');
        input.value = originalValue;
    }
};

window.deleteCurrentTransaction = function () {
    if (editingTransactionId) {
        deleteTransaction(editingTransactionId);
    }
};

window.deleteTransaction = async function (id) {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;

    try {
        const response = await fetch(`/api/salary/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Silinemedi');

        showAlert('İşlem silindi', 'success');
        await loadData();
    } catch (e) {
        console.error(e);
        showAlert('Hata: İşlem silinemedi', 'error');
    }
};

// --- System Roles ---
async function loadSystemRoles() {
    const select = document.getElementById('systemRole');
    if (!select) return;

    // If already loaded and has options > 1 (more than placeholder), skip
    if (select.options.length > 1) return;

    try {
        select.innerHTML = '<option value="">Yükleniyor...</option>';
        const response = await fetch('/api/roles');
        if (!response.ok) throw new Error('Roller yüklenemedi');

        const roles = await response.json();

        select.innerHTML = ''; // Clear loading/placeholder

        let personelRoleId = null;

        roles.forEach(role => {
            const opt = document.createElement('option');
            opt.value = role.id;
            opt.textContent = role.name;
            select.appendChild(opt);

            // Check if this is the 'Personel' role to set as default
            if (role.name === 'Personel') {
                personelRoleId = role.id;
            }
        });

        // Set default to Personel if found
        if (personelRoleId) {
            select.value = personelRoleId;
        }
    } catch (e) {
        console.error(e);
        select.innerHTML = '<option value="">Hata!</option>';
    }
}


// Utils
function formatCurrency(v) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v);
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR');
}

function getAccountLabel(acc) {
    const map = {
        'cash': '💵 Nakit Kasa',
        'bank_a': '🏦 Banka A',
        'bank_b': '🏦 Banka B',
        'personal': '👤 Şahsi'
    };
    return map[acc] || acc;
}

// Global close modal function
window.closeModal = function (modalId) {
    if (modalId) {
        document.getElementById(modalId).style.display = 'none';
    } else {
        // Fallback: close all
        const modals = document.querySelectorAll('.modal');
        modals.forEach(m => m.style.display = 'none');
    }
}

// Close modal on outside click
window.onclick = function (event) {
    const transModal = document.getElementById('transactionModal');
    const empModal = document.getElementById('employeeModal');
    const archivedModal = document.getElementById('archivedEmployeesModal');

    if (event.target == transModal) closeModal('transactionModal');
    if (event.target == empModal) closeModal('employeeModal');
    if (event.target == archivedModal) closeModal('archivedEmployeesModal');
}
