// Auth check
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

// Global state
let employeeId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    employeeId = urlParams.get('id');

    if (!employeeId) {
        alert('Geçersiz personel ID');
        window.location.href = '/employees.html';
        return;
    }

    await loadEmployeeDetails();
    await loadHistory();
});

async function loadEmployeeDetails() {
    try {
        // We fetch all and find because we don't have a single GET endpoint guaranteed
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Personel bilgisi alınamadı');

        const employees = await response.json();
        const employee = employees.find(e => e.id == employeeId); // loose match for string/int

        if (!employee) {
            alert('Personel bulunamadı');
            window.location.href = '/employees.html';
            return;
        }

        document.getElementById('pageTitle').textContent = `${employee.full_name} - Detay`;
        // We can add more specific header info here if needed
    } catch (error) {
        console.error('Hata:', error);
    }
}

async function loadHistory() {
    try {
        const response = await fetch(`/api/attendance/employee/${employeeId}`);
        if (!response.ok) throw new Error('Geçmiş yüklenemedi');

        const history = await response.json();
        renderHistory(history);
        calculateStats(history);

    } catch (error) {
        console.error('Hata:', error);
        document.getElementById('historyList').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Veri yüklenirken hata oluştu</td></tr>';
    }
}

function calculateStats(history) {
    // worked = true -> Count as day
    // hours_worked -> Count as overtime

    let totalDays = 0;
    let totalOvertime = 0;
    let lastWorkDate = '-';

    // History is ordered DESC date
    const workedDays = history.filter(h => h.worked);

    totalDays = workedDays.length;
    totalOvertime = workedDays.reduce((sum, h) => sum + (parseFloat(h.hours_worked) || 0), 0);

    if (workedDays.length > 0) {
        lastWorkDate = formatDate(workedDays[0].date);
    }

    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('totalOvertime').textContent = totalOvertime.toFixed(1); // 1 decimal if needed
    document.getElementById('lastWorkDate').textContent = lastWorkDate;
}

function renderHistory(history) {
    const tbody = document.getElementById('historyList');

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Kayıt bulunamadı</td></tr>';
        return;
    }

    tbody.innerHTML = history.map(item => `
        <tr class="${!item.worked ? 'bg-gray-50' : ''}">
            <td>${formatDate(item.date)}</td>
            <td>
                <span class="badge ${item.worked ? 'badge-success' : 'badge-danger'}">
                    ${item.worked ? 'Çalıştı' : 'Gelmedi'}
                </span>
            </td>
            <td>${item.worked ? (item.hours_worked > 0 ? `<span class="text-primary font-bold">+${item.hours_worked} Saat</span>` : '-') : '-'}</td>
            <td>${item.location || '-'}</td>
            <td>${item.notes || '-'}</td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    // dateString usually YYYY-MM-DD
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}
