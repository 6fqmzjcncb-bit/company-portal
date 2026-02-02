// Auth check
if (!sessionStorage.getItem('isAuthenticated')) {
    window.location.href = '/index.html';
}

// User info display
document.addEventListener('DOMContentLoaded', () => {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');

    if (userName) {
        document.getElementById('userName').textContent = userName;
        document.getElementById('userRole').textContent = userRole === 'admin' ? 'Yönetici' : 'Personel';
    }

    // Set default period (this month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    document.getElementById('periodStart').value = firstDay.toISOString().split('T')[0];
    document.getElementById('periodEnd').value = lastDay.toISOString().split('T')[0];

    loadPaymentHistory();
});

function logout() {
    sessionStorage.clear();
    window.location.href = '/index.html';
}

let calculations = [];

// Calculate salaries for all employees
async function calculateSalaries() {
    const start = document.getElementById('periodStart').value;
    const end = document.getElementById('periodEnd').value;

    if (!start || !end) {
        alert('Lütfen başlangıç ve bitiş tarihlerini seçin');
        return;
    }

    try {
        // Get all active employees
        const empResponse = await fetch('/api/employees');
        const employees = await empResponse.json();
        const activeEmployees = employees.filter(e => e.is_active);

        // Calculate for each employee
        calculations = [];
        for (const emp of activeEmployees) {
            const calcResponse = await fetch(`/api/salary/calculate?employee_id=${emp.id}&start_date=${start}&end_date=${end}`);
            const calc = await calcResponse.json();
            calc.phone = emp.phone;
            calculations.push(calc);
        }

        renderSalaryCalculations();
    } catch (error) {
        console.error('Hata:', error);
        alert('Maaş hesaplama sırasında hata oluştu');
    }
}

// Render salary calculations
function renderSalaryCalculations() {
    const container = document.getElementById('salaryCards');
    const start = document.getElementById('periodStart').value;
    const end = document.getElementById('periodEnd').value;

    document.getElementById('calculationTitle').textContent =
        `Maaş Hesapları (${formatDate(start)} - ${formatDate(end)})`;

    if (calculations.length === 0) {
        container.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Hesaplama sonucu yok</p>';
        return;
    }

    container.innerHTML = calculations.map(calc => `
        <div class="salary-card">
            <div class="salary-card-header">
                <h3>${calc.employee_name}</h3>
                <span class="badge badge-info">${calc.calculation_type === 'monthly' ? 'Aylık' : 'Günlük'}</span>
            </div>
            <div class="salary-card-body">
                <div class="salary-stat">
                    <span class="stat-label">Çalışılan Gün:</span>
                    <span class="stat-value">${calc.days_worked}</span>
                </div>
                <div class="salary-stat">
                    <span class="stat-label">Toplam Saat:</span>
                    <span class="stat-value">${calc.total_hours.toFixed(1)}</span>
                </div>
                <div class="salary-stat highlight">
                    <span class="stat-label">Hesaplanan Maaş:</span>
                    <span class="stat-value">${formatCurrency(calc.amount_calculated)}</span>
                </div>
                ${calc.phone ? `<div class="salary-phone">📞 ${calc.phone}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Save all payments
async function saveAllPayments() {
    if (calculations.length === 0) {
        alert('Önce maaş hesaplama yapmalısınız');
        return;
    }

    if (!confirm(`${calculations.length} personel için ödeme kaydı oluşturulacak. Onaylıyor musunuz?`)) {
        return;
    }

    const start = document.getElementById('periodStart').value;
    const end = document.getElementById('periodEnd').value;

    try {
        for (const calc of calculations) {
            await fetch('/api/salary/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: calc.employee_id,
                    period_start: calc.period_start,
                    period_end: calc.period_end,
                    days_worked: calc.days_worked,
                    total_hours: calc.total_hours,
                    amount_paid: calc.amount_calculated,
                    payment_date: new Date().toISOString().split('T')[0],
                    notes: `${calc.calculation_type === 'monthly' ? 'Aylık' : 'Günlük'} maaş ödemesi`
                })
            });
        }

        alert('Tüm ödemeler başarıyla kaydedildi!');
        loadPaymentHistory();
        calculations = [];
        document.getElementById('salaryCards').innerHTML =
            '<p class="text-center" style="grid-column: 1/-1;">Ödemeler kaydedildi. Yeni hesaplama için dönem seçin.</p>';
    } catch (error) {
        console.error('Hata:', error);
        alert('Ödeme kaydı sırasında hata oluştu');
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const response = await fetch('/api/salary/payments');
        const payments = await response.json();
        renderPaymentHistory(payments);
    } catch (error) {
        console.error('Hata:', error);
        document.getElementById('paymentHistory').innerHTML =
            '<tr><td colspan="7" class="text-center">Yükleme hatası</td></tr>';
    }
}

// Render payment history
function renderPaymentHistory(payments) {
    const tbody = document.getElementById('paymentHistory');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Henüz ödeme kaydı yok</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td><strong>${payment.employee.full_name}</strong></td>
            <td>${formatDate(payment.period_start)} - ${formatDate(payment.period_end)}</td>
            <td>${payment.days_worked}</td>
            <td>${payment.total_hours ? payment.total_hours.toFixed(1) : '-'}</td>
            <td><strong>${formatCurrency(payment.amount_paid)}</strong></td>
            <td>${formatDate(payment.payment_date)}</td>
            <td>
                <button class="btn-icon" onclick="deletePayment(${payment.id})" title="Sil">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Delete payment
async function deletePayment(id) {
    if (!confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`/api/salary/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Silme başarısız');

        alert('Ödeme kaydı silindi');
        loadPaymentHistory();
    } catch (error) {
        console.error('Hata:', error);
        alert('Silme sırasında hata oluştu');
    }
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}
