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

// User info display
document.addEventListener('DOMContentLoaded', async () => {
    // document.getElementById('userName').textContent = currentUser.full_name;
    // document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';
    // DEBUG:
    // alert('Page loaded');

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (currentUser.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
    }

    await loadEmployees();
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
let editingId = null;

// Load employees
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Personel listesi alınamadı');

        employees = await response.json();
        renderEmployees(employees);
    } catch (error) {
        console.error('Hata:', error);
        alert('Personel listesi yüklenirken hata oluştu');
    }
}

// Render employees table
function renderEmployees(data) {
    const tbody = document.getElementById('employeeList');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Henüz personel kaydı yok</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(emp => `
        <tr>
            <td>
                <a href="/employee-detail.html?id=${emp.id}" class="text-primary hover:underline" style="font-weight: bold; text-decoration: none;">
                    ${emp.full_name} ↗
                </a>
            </td>
            <td>
                ${emp.user ? `<span class="badge badge-secondary">${emp.user.username}</span>` : '<span class="text-muted">-</span>'}
            </td>
            <td>
                ${emp.user ? `
                    <div class="password-mask" onclick="showPasswordAction(${emp.user_id}, '${emp.full_name}')" style="cursor: pointer;" title="Şifre İşlemleri">
                        <span style="font-family: monospace; letter-spacing: 2px;">••••••</span>
                        <span style="font-size: 12px; margin-left: 5px;">👁️</span>
                    </div>
                ` : '-'}
            </td>
            <td>${emp.phone || '-'}</td>
            <td>${getRoleText(emp.role)}</td>
            <td>${emp.daily_wage ? formatCurrency(emp.daily_wage) : '-'}</td>
            <td>${emp.monthly_salary ? formatCurrency(emp.monthly_salary) : '-'}</td>
            <td>${emp.hire_date ? formatDate(emp.hire_date) : '-'}</td>
            <td>
                <span class="badge ${emp.is_active ? 'badge-success' : 'badge-danger'}">
                    ${emp.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                <button class="btn-icon" onclick="editEmployee(${emp.id})" title="Düzenle">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteEmployee(${emp.id})" title="Sil">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter employees
function filterEmployees() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm) ||
        (emp.phone && emp.phone.includes(searchTerm))
    );
    renderEmployees(filtered);
}

// Show add modal
function showAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Personel Ekle';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';

    // Enable inputs (in case they were disabled by view mode)
    setModalInputsDisabled(false);

    document.getElementById('employeeModal').style.display = 'flex';
}

// Edit employee
function editEmployee(id) {
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

    // Enable inputs
    setModalInputsDisabled(false);

    document.getElementById('employeeModal').style.display = 'flex';
}

function setModalInputsDisabled(disabled) {
    const form = document.getElementById('employeeForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.disabled = disabled);

    // Hide/Show Save button
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.style.display = disabled ? 'none' : 'block';
}

// Delete employee
async function deleteEmployee(id) {
    const employee = employees.find(e => e.id === id);
    if (!confirm(`"${employee.full_name}" personelini pasif hale getirmek istediğinizden emin misiniz?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Silme işlemi başarısız');

        alert('Personel pasif hale getirildi');
        loadEmployees();
    } catch (error) {
        console.error('Hata:', error);
        alert('Personel silinirken hata oluştu');
    }
}

// Close modal
function closeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

// Form submit handler - Global function to be called by button
console.log('employees.js loaded');

// Make function available globally
window.submitEmployeeForm = async function () {
    console.log('submitEmployeeForm called');
    const submitBtn = document.querySelector('#employeeForm button[onclick*="submitEmployeeForm"]');
    const originalText = submitBtn ? submitBtn.innerText : 'Kaydet';

    // Basic Validation
    const fullNameInput = document.getElementById('fullName');
    const roleInput = document.getElementById('role');

    if (!fullNameInput || !roleInput) {
        alert('Hata: Form elemanları bulunamadı!');
        return;
    }

    if (!fullNameInput.value || !roleInput.value) {
        alert('Lütfen Ad Soyad ve Rol alanlarını doldurun.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'İşleniyor...';
    }

    const formData = {
        full_name: fullNameInput.value,
        phone: document.getElementById('phone').value || null,
        role: roleInput.value,
        daily_wage: document.getElementById('dailyWage').value || null,
        monthly_salary: document.getElementById('monthlySalary').value || null,
        hire_date: document.getElementById('hireDate').value || null,
        notes: document.getElementById('notes').value || null,
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
            console.error('JSON Parse Error:', e);
            throw new Error('Sunucudan geçersiz yanıt alındı.');
        }

        if (!response.ok) throw new Error(result.error || 'Kayıt başarısız');

        if (result.createdUser) {
            alert(`✅ Personel ve Kullanıcı Hesabı Oluşturuldu!\n\n👤 Kullanıcı Adı: ${result.createdUser.username}\n🔑 Şifre: ${result.createdUser.password}\n\nLütfen bu bilgileri personel ile paylaşın.`);
        } else {
            alert(editingId ? 'Personel güncellendi' : 'Personel eklendi');
        }

        closeModal();
        loadEmployees();
    } catch (error) {
        console.error('Hata:', error);
        alert('İşlem sırasında hata oluştu: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    }
};

// Helper functions
function getRoleText(role) {
    const roles = {
        'worker': 'İşçi',
        'supervisor': 'Ustabaşı',
        'manager': 'Yönetici'
    };
    return roles[role] || role;
}

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

// Password Action
async function showPasswordAction(userId, name) {
    // Since we cannot show the password (hashed), we offer to reset it.
    // The user specifically asked to "see" it. I have to explain.
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

// Helper functions
function getRoleText(role) {
    const roles = {
        'worker': 'İşçi',
        'supervisor': 'Ustabaşı',
        'manager': 'Yönetici'
    };
    return roles[role] || role;
}

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
