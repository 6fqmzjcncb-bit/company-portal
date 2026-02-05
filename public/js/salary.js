// Auth check
let currentUser = null;
let allEmployees = [];

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

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    // Set default date for transaction
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transDate').value = today;

    await loadData();
});

async function loadData() {
    await loadBalances();
    await loadHistory();
}

// --------------------------------------------------------------------------
// EMPLOYEE CRUD SECTION
// --------------------------------------------------------------------------

function showAddEmployeeModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('editEmpId').value = '';
    document.getElementById('empModalTitle').textContent = 'Yeni Personel Ekle';
    document.getElementById('btnDeleteEmployee').style.display = 'none'; // Hide delete for new
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
    document.getElementById('role').value = 'worker'; // Default or fetch real role if available in /balance. Currently /balance returns simple object. 
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
        document.getElementById('role').value = fullEmp.role;
        document.getElementById('dailyWage').value = fullEmp.daily_wage || '';
        document.getElementById('monthlySalary').value = fullEmp.monthly_salary || '';
        document.getElementById('hireDate').value = fullEmp.hire_date ? fullEmp.hire_date.split('T')[0] : '';
        document.getElementById('notes').value = fullEmp.notes || '';

        document.getElementById('employeeModal').style.display = 'flex';
    }).catch(err => alert('Personel detayı yüklenemedi'));
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editEmpId').value;
    const data = {
        full_name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        role: document.getElementById('role').value,
        daily_wage: document.getElementById('dailyWage').value || null,
        monthly_salary: document.getElementById('monthlySalary').value || null,
        hire_date: document.getElementById('hireDate').value || null,
        notes: document.getElementById('notes').value,
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

        if (!response.ok) throw new Error('İşlem başarısız');

        closeModal('employeeModal');
        await loadData(); // Reload table
        alert('Personel kaydedildi');
    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

async function deleteEmployee(id) {
    if (!confirm('Bu personeli ve tüm verilerini silmek istediğinize emin misiniz?')) return;

    try {
        const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Silinemedi');
        await loadData();
    } catch (error) {
        alert('Silme işlemi başarısız');
    }
}

// Event Listener for Employee Form
document.getElementById('employeeForm').addEventListener('submit', handleEmployeeSubmit);


// --------------------------------------------------------------------------
// UPDATED LOAD BALANCES
// --------------------------------------------------------------------------

async function loadBalances() {
    try {
        console.log('Veri yükleniyor...');
        const response = await fetch('/api/salary/balance');

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
                <td style="min-width: 140px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span class="text-muted small" style="min-width: 45px;">${formatCurrency(emp.total_reimbursement || 0)}</span>
                        <input type="number" 
                            class="form-control form-control-sm" 
                            style="width: 80px; padding: 2px 5px; height: 24px;" 
                            placeholder="EKLE"
                            onchange="handleQuickReimbursement(${emp.id}, this)">
                    </div>
                </td>
                <td>${formatCurrency(emp.total_paid + emp.total_expense)}</td>
                <td><strong class="${balanceClass}">${formatCurrency(emp.current_balance)}</strong></td>
                <td>
                    <button class="btn-small btn-success" onclick="openPaymentModal(${emp.id})">
                        İşlem Yap
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
    const balanceDisplay = document.getElementById('currentBalanceDisplay');

    if (empId) {
        const emp = allEmployees.find(e => e.id == empId);
        if (emp) {
            balanceDisplay.textContent = `Mevcut Bakiye: ${formatCurrency(emp.current_balance)}`;
        }
    } else {
        balanceDisplay.textContent = '';
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
    const type = document.querySelector('input[name="transType"]:checked').value;
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
                transaction_type: type,
                account: account,
                payment_date: date,
                notes: notes
            })
        });

        if (!response.ok) throw new Error('Kaydedilemedi');

        alert('İşlem başarıyla kaydedildi');
        closeModal();
        loadData(); // Refresh all tables

    } catch (error) {
        alert('Hata: ' + error.message);
    }
});

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

async function handleQuickReimbursement(empId, input) {
    const amount = input.value;
    if (!amount || amount <= 0) return;

    try {
        // Disable input while processing
        input.disabled = true;

        const response = await fetch('/api/salary/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: empId,
                amount_paid: amount,
                transaction_type: 'reimbursement', // Maps to Harcamalar/Masraf
                notes: 'Hızlı Ekleme (Tablo)',
                payment_date: new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) throw new Error('Kaydedilemedi');

        // Success feedback
        input.style.borderColor = 'green';
        setTimeout(() => loadBalances(), 500); // Reload table

    } catch (error) {
        alert('Hata: ' + error.message);
        input.disabled = false;
        input.style.borderColor = 'red';
    }
}
