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

function editEmployee(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('empModalTitle').textContent = 'Personel Düzenle';
    document.getElementById('btnDeleteEmployee').style.display = 'block'; // Show delete for edit
    document.getElementById('btnDeleteEmployee').onclick = () => deleteEmployee(id); // Bind delete

    document.getElementById('editEmpId').value = emp.id;
    document.getElementById('fullName').value = emp.full_name;
    document.getElementById('phone').value = emp.phone || ''; // Assuming phone might be available in future backend update or currently hidden
    // document.getElementById('role').value = 'worker'; // Removed default 
    // START_DATE fix: We need fetch full details or rely on what we have. 
    // /balance endpoint returns: {id, full_name, daily_wage, start_date ...}
    // It does NOT return phone, role, hire_date, monthly_salary, notes etc fully.
    // OPTIMAL TRICK: We should probably fetch /api/employees to get full list for editing, 
    // or update /balance to return everything.
    // Let's use /api/employees fetch inside loadData to populate a full list for editing context.

    // For now, let's fetch full employee details on Edit click to be safe
    fetch(`/api/employees/${id}`).then(res => res.json()).then(fullEmp => {
        document.getElementById('fullName').value = fullEmp.full_name;
        document.getElementById('phone').value = fullEmp.phone || '';
        document.getElementById('phone').value = fullEmp.phone || '';

        // Load roles and set selected
        loadSystemRoles().then(() => {
            // We need to know which role the user has. 
            // The /api/employees/:id endpoint returns `user` object.
            // We need to check fullEmp.user.role_id if available or fetch user details.
            // Current /api/employees/:id implementation returns `user` with `username` and `is_active`.
            // It does NOT return role_id directly. 
            // However, `roles.js` logic links User->Role. 
            // Let's assume for now we might not show the specific System Role in Edit unless we update the backend to return it.
            // For now, just load the list.
            if (fullEmp.user && fullEmp.user.role_id) {
                document.getElementById('systemRole').value = fullEmp.user.role_id;
            }
        });

        document.getElementById('dailyWage').value = fullEmp.daily_wage || '';
        document.getElementById('monthlySalary').value = fullEmp.monthly_salary || '';
        document.getElementById('hireDate').value = fullEmp.hire_date ? fullEmp.hire_date.split('T')[0] : '';
        document.getElementById('notes').value = fullEmp.notes || '';

        document.getElementById('notes').value = fullEmp.notes || '';

        // Button Logic: Fire vs Re-hire
        const btnDelete = document.getElementById('btnDeleteEmployee');
        if (fullEmp.is_active) {
            btnDelete.innerText = 'İşten Çıkar';
            btnDelete.className = 'btn btn-danger';
            btnDelete.onclick = () => deleteEmployee(id);
            btnDelete.style.display = 'block';
        } else {
            btnDelete.innerText = 'İşe Geri Al (Aktifleştir)';
            btnDelete.className = 'btn btn-success';
            btnDelete.onclick = () => reactivateEmployee(id);
            btnDelete.style.display = 'block';
        }

        document.getElementById('employeeModal').style.display = 'flex';
    }).catch(err => showAlert('Personel detayı yüklenemedi'));
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

async function loadBalances() {
    try {
        const showArchived = document.getElementById('showArchived').checked;
        console.log('Veri yükleniyor... Arşiv:', showArchived);
        const response = await fetch(`/api/salary/balance?showArchived=${showArchived}`);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Sunucu Hatası: ${response.status} - ${errText}`);
        }

        const balances = await response.json();
        console.log('Gelen veri:', balances);

        // Save for modal lookup
        allEmployees = balances;
        updateEmployeeSelect(); // Populate dropdown

        const tbody = document.getElementById('balanceTable');

        if (balances.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Personel bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = balances.map(emp => {
            const balanceClass = emp.current_balance > 0 ? 'text-danger' : 'text-success';

            // Format Daily Wage nicely
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
                        <input type="number" 
                            style="border: none; outline: none; width: 100%; text-align: right; padding: 0; font-size: 1rem; background: transparent;" 
                            value="${parseFloat((emp.total_reimbursement || 0).toFixed(2))}"
                            data-original-value="${emp.total_reimbursement || 0}"
                            onchange="handleSmartReimbursement(${emp.id}, this)">
                        <span style="font-size: 12px; color: #888; margin-left: 4px; font-weight: 500;">TL</span>
                    </div>
                </td>
                <td>${formatCurrency(emp.total_paid + emp.total_expense)}</td>
                <td><strong class="${balanceClass}">${formatCurrency(emp.current_balance)}</strong></td>
                <td>
                    <button class="btn-small btn-success" onclick="openPaymentModal(${emp.id})">
                        Ödeme Yap
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Bakiye yükleme hatası:', error);
        document.getElementById('balanceTable').innerHTML =
            `<tr><td colspan="9" class="text-center text-danger">⚠️ Veri yüklenemedi: ${error.message}<br><button onclick="loadBalances()" class="btn-small btn-secondary mt-2">Tekrar Dene</button></td></tr>`;
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/api/salary/payments');
        if (!response.ok) throw new Error('Veri alınamadı');

        const transactions = await response.json();

        const tbody = document.getElementById('transactionHistory');
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Kayıt bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(t => {
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
    document.getElementById('transactionForm').reset();
    document.getElementById('employeeId').value = '';

    // Set Default Date
    document.getElementById('transDate').value = new Date().toISOString().split('T')[0];

    document.getElementById('transactionModal').style.display = 'flex';
}

function openPaymentModal(empId) {
    showTransactionModal();
    document.getElementById('employeeSelect').value = empId;
    document.querySelector('input[name="transType"][value="payment"]').checked = true;
    updateEmployeeContext();
}

function openExpenseModal(empId) {
    showTransactionModal();
    document.getElementById('employeeSelect').value = empId;
    document.querySelector('input[name="transType"][value="expense"]').checked = true;
    updateEmployeeContext();
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
    const type = document.querySelector('input[name="transType"]:checked').value;
    const accountGroup = document.getElementById('accountGroup');
    // Account selection is only needed for actual Money OUT (Payment)
    accountGroup.style.display = (type === 'payment') ? 'block' : 'none';
}

// Form Submission
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const empId = document.getElementById('employeeSelect').value;
    // const type = document.querySelector('input[name="transType"]:checked').value; // Removed
    const amount = document.getElementById('transAmount').value;
    const account = document.getElementById('accountSelect').value;
    const date = document.getElementById('transDate').value;
    const notes = document.getElementById('transNotes').value;

    try {
        const response = await fetch('/api/salary/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: empId,
                amount_paid: amount,
                transaction_type: 'payment', // Always payment from modal
                account: account,
                payment_date: date,
                notes: notes
            })
        });

        if (!response.ok) throw new Error('Kaydedilemedi');

        showAlert('İşlem başarıyla kaydedildi');
        closeModal();
        loadData(); // Refresh all tables

    } catch (error) {
        showAlert('Hata: ' + error.message);
    }
});

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

    if (event.target == transModal) {
        closeModal('transactionModal');
    }
    if (event.target == empModal) {
        closeModal('employeeModal');
    }
}

async function handleSmartReimbursement(empId, input) {
    const newVal = parseFloat(input.value);
    const oldVal = parseFloat(input.getAttribute('data-original-value')) || 0;

    if (isNaN(newVal)) {
        input.value = oldVal.toFixed(2); // Reset on error
        return;
    }

    const diff = newVal - oldVal;
    if (Math.abs(diff) < 0.01) return; // No change

    try {
        input.disabled = true;

        const response = await fetch('/api/salary/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: empId,
                amount_paid: diff, // Send the difference (positive or negative)
                transaction_type: 'reimbursement', // Maps to Harcamalar/Masraf
                notes: 'Tablodan düzenleme (Fark: ' + diff.toFixed(2) + ')',
                payment_date: new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) throw new Error('Kaydedilemedi');

        // Success: Update original value to prevent double-submit
        input.dataset.originalValue = newVal;
        input.style.borderColor = 'green';
        setTimeout(() => loadBalances(), 500); // Refresh to be safe

    } catch (error) {
        showAlert('Hata: ' + error.message);
        input.value = oldVal.toFixed(2); // Revert
        input.disabled = false;
        input.style.borderColor = 'red';
    }
}

async function deleteEmployee(id) {
    if (!confirm('Bu personeli işten çıkarmak istediğinize emin misiniz? Bu işlem personeli arşivleyecektir.')) return;

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
