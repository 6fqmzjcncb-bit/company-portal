// Auth check
let currentUser = null;

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

// User info display and initialization
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (currentUser.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
    }

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('selectedDate').value = today;

    await loadEmployees();
    await loadAttendance();
});

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

let employees = [];
let attendanceRecords = {};

// Load attendance for selected date
async function loadAttendance() {
    const date = document.getElementById('selectedDate').value;
    if (!date) {
        alert('Lütfen tarih seçin');
        return;
    }

    try {
        // Load employees
        const empResponse = await fetch('/api/employees');
        employees = await empResponse.json();
        employees = employees.filter(e => e.is_active);

        // Load attendance records for this date
        const attResponse = await fetch(`/api/attendance?date=${date}`);
        const records = await attResponse.json();

        // Create lookup
        attendanceRecords = {};
        records.forEach(rec => {
            attendanceRecords[rec.employee_id] = rec;
        });

        renderAttendance(date);
    } catch (error) {
        console.error('Hata:', error);
        alert('Veri yüklenirken hata oluştu');
    }
}

// Render attendance table
function renderAttendance(date) {
    const tbody = document.getElementById('attendanceList');
    document.getElementById('dateTitle').textContent = `${formatDate(date)} - Çalışma Kaydı`;

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aktif personel bulunamadı</td></tr>';
        return;
    }

    tbody.innerHTML = employees.map((emp, index) => {
        const record = attendanceRecords[emp.id] || {};
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${emp.full_name}</strong></td>
                <td class="text-center">
                    <input 
                        type="checkbox" 
                        id="worked_${emp.id}" 
                        ${record.worked ? 'checked' : ''}
                        onchange="toggleWorked(${emp.id})"
                        style="width: 20px; height: 20px; cursor: pointer;">
                </td>
                <td>
                    <input 
                        type="number" 
                        id="hours_${emp.id}" 
                        value="${record.hours_worked || 8}"
                        min="0" 
                        max="24" 
                        step="0.5"
                        class="input-small"
                        ${!record.worked ? 'disabled' : ''}>
                </td>
                <td>
                    <input 
                        type="text" 
                        id="location_${emp.id}" 
                        value="${record.location || ''}"
                        placeholder="Şantiye/Proje adı"
                        class="input-small"
                        ${!record.worked ? 'disabled' : ''}>
                </td>
                <td>
                    <input 
                        type="text" 
                        id="notes_${emp.id}" 
                        value="${record.notes || ''}"
                        placeholder="Notlar"
                        class="input-small">
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle worked checkbox
function toggleWorked(empId) {
    const worked = document.getElementById(`worked_${empId}`).checked;
    document.getElementById(`hours_${empId}`).disabled = !worked;
    document.getElementById(`location_${empId}`).disabled = !worked;

    if (!worked) {
        document.getElementById(`hours_${empId}`).value = 0;
        document.getElementById(`location_${empId}`).value = '';
    } else {
        document.getElementById(`hours_${empId}`).value = 8;
    }
}

// Mark all as worked/not worked
function markAllWorked(worked) {
    employees.forEach(emp => {
        document.getElementById(`worked_${emp.id}`).checked = worked;
        toggleWorked(emp.id);
    });
}

// Save all attendance records
async function saveAllAttendance() {
    const date = document.getElementById('selectedDate').value;
    const records = [];

    employees.forEach(emp => {
        const worked = document.getElementById(`worked_${emp.id}`).checked;
        const hours = parseFloat(document.getElementById(`hours_${emp.id}`).value) || 0;
        const location = document.getElementById(`location_${emp.id}`).value;
        const notes = document.getElementById(`notes_${emp.id}`).value;

        records.push({
            employee_id: emp.id,
            worked,
            hours_worked: worked ? hours : 0,
            location: worked ? location : null,
            notes: notes || null
        });
    });

    try {
        const response = await fetch('/api/attendance/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, records })
        });

        if (!response.ok) throw new Error('Kayıt başarısız');

        alert('Tüm kayıtlar başarıyla kaydedildi!');
        loadAttendance();
    } catch (error) {
        console.error('Hata:', error);
        alert('Kayıt sırasında hata oluştu');
    }
}

// Helper function
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
