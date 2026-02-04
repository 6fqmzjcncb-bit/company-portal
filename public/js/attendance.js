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
// Load employees once
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Personel listesi alınamadı');

        let allEmployees = await response.json();
        // Filter active employees
        employees = allEmployees.filter(e => e.is_active);
    } catch (error) {
        console.error('Personel yükleme hatası:', error);
        alert('Personel listesi yüklenemedi');
    }
}

// Load attendance for selected date
async function loadAttendance() {
    const date = document.getElementById('selectedDate').value;
    if (!date) {
        alert('Lütfen tarih seçin');
        return;
    }

    try {
        // If employees are not loaded yet (edge case)
        if (employees.length === 0) {
            await loadEmployees();
        }

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
        // hours_worked now represents OVERTIME. Default to 0 if not present.
        const overtime = record.hours_worked || 0;

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
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input 
                            type="number" 
                            id="hours_${emp.id}" 
                            value="${overtime}"
                            min="0" 
                            max="24" 
                            step="0.5"
                            class="input-small"
                            style="width: 60px;"
                            ${!record.worked ? 'disabled' : ''}>
                        <div style="display: flex; gap: 3px;">
                            <button class="btn-icon" onclick="addOvertime(${emp.id}, 1)" title="+1 Saat" ${!record.worked ? 'disabled' : ''}>+1</button>
                            <button class="btn-icon" onclick="addOvertime(${emp.id}, 2)" title="+2 Saat" ${!record.worked ? 'disabled' : ''}>+2</button>
                            <button class="btn-icon" onclick="addOvertime(${emp.id}, 3)" title="+3 Saat" ${!record.worked ? 'disabled' : ''}>+3</button>
                            <button class="btn-icon" onclick="setFullDayOvertime(${emp.id})" title="Tam Gün Mesai (8 saat)" ${!record.worked ? 'disabled' : ''} style="background: #fef3c7; border: 1px solid #f59e0b;">🌕</button>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input 
                            type="text" 
                            id="location_${emp.id}" 
                            value="${record.location || ''}"
                            placeholder="Şantiye/Proje adı"
                            class="input-small"
                            style="flex: 1;"
                            ${!record.worked ? 'disabled' : ''}>
                        ${index > 0 ? `
                        <button class="btn-icon" onclick="copyLocationFromAbove(${index})" title="Üstten Kopyala (⬇)" ${!record.worked ? 'disabled' : ''} style="font-size: 1.2rem;">⬇</button>
                        ` : ''}
                    </div>
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

    // Toggle Overtime Inputs
    document.getElementById(`hours_${empId}`).disabled = !worked;
    const buttons = document.querySelectorAll(`button[onclick*="${empId}"]`);
    buttons.forEach(btn => btn.disabled = !worked);

    // Toggle Location Input
    document.getElementById(`location_${empId}`).disabled = !worked;

    // Note: We do NOT clear values when unchecked, to preserve data if accidentally clicked.
    // Logic: If unchecked, we save it as not worked, but UI keeps the text for convenience.
}

// Add OVERTIME hours
function addOvertime(empId, hours) {
    const input = document.getElementById(`hours_${empId}`);
    const currentValue = parseFloat(input.value) || 0;
    const newValue = currentValue + hours;
    input.value = newValue;
}

// Set Full Day OVERTIME (Assuming 8 hours or standard shift)
function setFullDayOvertime(empId) {
    document.getElementById(`hours_${empId}`).value = 8;
}

// Copy Location from the row above
function copyLocationFromAbove(currentIndex) {
    if (currentIndex <= 0) return;

    const currentEmp = employees[currentIndex];
    const prevEmp = employees[currentIndex - 1];

    const prevLocation = document.getElementById(`location_${prevEmp.id}`).value;
    const currentLocationInput = document.getElementById(`location_${currentEmp.id}`);

    if (currentLocationInput && !currentLocationInput.disabled) {
        currentLocationInput.value = prevLocation;
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
        const overtime = parseFloat(document.getElementById(`hours_${emp.id}`).value) || 0;
        const location = document.getElementById(`location_${emp.id}`).value;
        const notes = document.getElementById(`notes_${emp.id}`).value;

        records.push({
            employee_id: emp.id,
            worked,
            hours_worked: worked ? overtime : 0, // Store OVERTIME here
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
