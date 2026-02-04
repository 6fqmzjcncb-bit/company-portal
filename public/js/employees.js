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
    currentUser = await checkAuth();
    if (!currentUser) return;

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
            <td><strong>${emp.full_name}</strong></td>
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

// Form submit
document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        full_name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value || null,
        role: document.getElementById('role').value,
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

        if (!response.ok) throw new Error('Kayıt başarısız');

        alert(editingId ? 'Personel güncellendi' : 'Personel eklendi');
        closeModal();
        loadEmployees();
    } catch (error) {
        console.error('Hata:', error);
        alert('İşlem sırasında hata oluştu');
    }
});

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

// Close modal on outside click
window.onclick = function (event) {
    const modal = document.getElementById('employeeModal');
    if (event.target === modal) {
        closeModal();
    }
}
