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

async function loadBalances() {
    try {
        const response = await fetch('/api/salary/balance');
        const balances = await response.json();

        // Save for modal lookup
        allEmployees = balances;
        updateEmployeeSelect(); // Populate dropdown

        const tbody = document.getElementById('balanceTable');

        if (balances.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Personel bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = balances.map(emp => {
            const balanceClass = emp.current_balance > 0 ? 'text-danger' : 'text-success';

            return `
            <tr>
                <td><strong>${emp.full_name}</strong></td>
                <td>${formatCurrency(emp.daily_wage || 0)}</td>
                <td><small>${formatDate(emp.start_date)}</small></td>
                <td>${emp.total_worked_days}</td>
                <td>${formatCurrency(emp.total_accrued + (emp.total_reimbursement || 0))}</td>
                <td>${formatCurrency(emp.total_paid + emp.total_expense)}</td>
                <td><strong class="${balanceClass}" style="font-size: 1.1em;">${formatCurrency(emp.current_balance)}</strong></td>
                <td>
                    <button class="btn-small btn-primary" onclick="openPaymentModal(${emp.id})">Öde</button>
                    <button class="btn-small border-danger text-danger" onclick="openExpenseModal(${emp.id})" style="background:white;">İşlem</button>
                </td>
            </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Hata:', error);
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

            return `
            <tr>
                <td><strong>${empName}</strong></td>
                <td>${formatDate(t.payment_date)}</td>
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

function closeModal() {
    document.getElementById('transactionModal').style.display = 'none';
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
    // Logic if we want to hide account select for expenses? 
    // Usually expenses also come from an account. Kept for now.
}

// Form Submission
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const empId = document.getElementById('employeeSelect').value;
    const type = document.querySelector('input[name="transType"]:checked').value;
    const amount = document.getElementById('amount').value;
    const account = document.getElementById('accountSelect').value;
    const date = document.getElementById('transDate').value;
    const notes = document.getElementById('notes').value;

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

// Close modal on outside click
window.onclick = function (event) {
    const modal = document.getElementById('transactionModal');
    if (event.target == modal) {
        closeModal();
    }
}
