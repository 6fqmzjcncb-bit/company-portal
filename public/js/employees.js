/* 
// EMPLOYEES.JS - TEMPORARILY DISABLED TO FIX SAVE BUTTON ISSUE
// ... (previous content commented out)
*/

// Auth check
let currentUser = null;
let employees = [];
let editingId = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('employees.js loaded and DOM ready');

    // Auth Check
    currentUser = await checkAuth();
    if (!currentUser) return;

    // UI Init
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';
    if (currentUser.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
    }

    // Attach Save Button Listener - ROBUST METHOD
    const saveBtn = document.getElementById('btnSaveEmployee');
    if (saveBtn) {
        console.log('Save button found, attaching listener');
        saveBtn.addEventListener('click', handleSaveEmployee);
    } else {
        console.error('Save button NOT found!');
        alert('Hata: Kaydet butonu bulunamadı!');
    }

    // Load Data
    await loadEmployees();
});

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

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

// Save Handler
async function handleSaveEmployee() {
    console.log('Save Handler Triggered');
    // alert('Kayıt işlemi başlatılıyor...');

    const submitBtn = document.getElementById('btnSaveEmployee');
    const originalText = submitBtn.innerText;

    // Inputs
    const fullNameInput = document.getElementById('fullName');
    const roleInput = document.getElementById('role');
    const phoneInput = document.getElementById('phone');
    const dailyWageInput = document.getElementById('dailyWage');
    const monthlySalaryInput = document.getElementById('monthlySalary');
    const hireDateInput = document.getElementById('hireDate');
    const notesInput = document.getElementById('notes');

    if (!fullNameInput.value || !roleInput.value) {
        alert('Lütfen Ad Soyad ve Rol alanlarını doldurun.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'İşleniyor...';

    const formData = {
        full_name: fullNameInput.value,
        phone: phoneInput.value || null,
        role: roleInput.value,
        daily_wage: dailyWageInput.value || null,
        monthly_salary: monthlySalaryInput.value || null,
        hire_date: hireDateInput.value || null,
        notes: notesInput.value || null,
        is_active: true
    };

    try {
        const url = editingId ? `/api/employees/${editingId}` : '/api/employees';
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('Sunucu yanıtı okunamadı.');
        }

        if (!response.ok) throw new Error(result.error || 'İşlem başarısız');

        if (result.createdUser) {
            alert(`✅ BAŞARILI!\n\nKullanıcı: ${result.createdUser.username}\nŞifre: ${result.createdUser.password}`);
        } else {
            alert('İşlem başarıyla tamamlandı.');
        }

        closeModal();
        loadEmployees();

    } catch (error) {
        console.error(error);
        alert('Hata: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

// Load employees
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Personel listesi alınamadı');
        employees = await response.json();
        renderEmployees(employees);
    } catch (error) {
        console.error('Hata:', error);
    }
}

// Render employees table
function renderEmployees(data) {
    const tbody = document.getElementById('employeeList');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Kayıt yok</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(emp => `
        <tr>
            <td>${emp.full_name}</td>
            <td>${emp.user ? `<span class="badge badge-secondary">${emp.user.username}</span>` : '-'}</td>
            <td>
                ${emp.user ? `<span style="cursor:pointer" onclick="showPasswordAction(${emp.user_id}, '${emp.full_name}')">🔑 Sıfırla</span>` : '-'}
            </td>
            <td>${emp.phone || '-'}</td>
            <td>${getRoleText(emp.role)}</td>
            <td>${emp.daily_wage ? formatCurrency(emp.daily_wage) : '-'}</td>
            <td>${emp.monthly_salary ? formatCurrency(emp.monthly_salary) : '-'}</td>
            <td>${emp.hire_date ? formatDate(emp.hire_date) : '-'}</td>
            <td><span class="badge ${emp.is_active ? 'badge-success' : 'badge-danger'}">${emp.is_active ? 'Aktif' : 'Pasif'}</span></td>
            <td>
                <button class="btn-icon" onclick="editEmployee(${emp.id})">✏️</button>
                <button class="btn-icon" onclick="deleteEmployee(${emp.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Helpers
function getRoleText(role) {
    const roles = { 'worker': 'İşçi', 'supervisor': 'Ustabaşı', 'manager': 'Yönetici' };
    return roles[role] || role;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
}

// Modal Functions
window.showAddModal = function () {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Personel Ekle';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('employeeModal').style.display = 'flex';
}

window.closeModal = function () {
    document.getElementById('employeeModal').style.display = 'none';
}

window.editEmployee = function (id) {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Personel Düzenle';
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('fullName').value = employee.full_name;
    document.getElementById('phone').value = employee.phone || '';
    document.getElementById('role').value = employee.role;
    document.getElementById('dailyWage').value = employee.daily_wage || '';
    document.getElementById('monthlySalary').value = employee.monthly_salary || '';
    document.getElementById('hireDate').value = employee.hire_date ? employee.hire_date.split('T')[0] : '';
    document.getElementById('notes').value = employee.notes || '';
    style: 'currency',
        currency: 'TRY'
}).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

// Password Action
async function showPasswordAction(userId, name) {
    if (confirm(`⚠️ Güvenlik notu: Şifreler şifrelenerek saklandığı için mevcut şifreyi görmeniz mümkün değildir.\n\n"${name}" kullanıcısının şifresini standart "123456" olarak sıfırlamak ister misiniz?`)) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: '123456' })
            });

            if (response.ok) {
                alert('Şifre başarıyla "123456" olarak güncellendi.');
            } else {
                const res = await response.json();
                alert('Hata: ' + (res.error || 'İşlem başarısız'));
            }
        } catch (error) {
            console.error(error);
            alert('Bağlantı hatası');
        }
    }
}

// Close modal on outside click
window.onclick = function (event) {
    const modal = document.getElementById('employeeModal');
    if (event.target === modal) {
        closeModal();
    }
}
