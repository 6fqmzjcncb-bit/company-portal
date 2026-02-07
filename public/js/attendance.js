// Auth check
let currentUser = null;

async function checkAuth() {
    const cachedUser = localStorage.getItem('user_cache');
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            updateUserInterface(user);
            currentUser = user;
        } catch (e) {
            console.error(e);
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
        localStorage.setItem('user_cache', JSON.stringify(user));
        updateUserInterface(user);
        return user;
    } catch (error) {
        if (!cachedUser) window.location.href = '/index.html';
        return currentUser;
    }
}

function updateUserInterface(user) {
    if (!user) return;
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('userRole').textContent = user.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    if (user.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
    }
}

// User info display and initialization
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth(); // Sets currentUser
    if (!currentUser) return;

    // Set today's date (Local time to avoid UTC mismatch)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    document.getElementById('selectedDate').value = today;

    // Event Listeners for Date Navigation
    document.getElementById('prevDayBtn').addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDayBtn').addEventListener('click', () => changeDate(1));

    await loadEmployees();
    await loadAttendance();
    await loadSummary();
});

async function loadSummary() {
    const container = document.getElementById('summaryGrid');
    if (!container) return;

    // Use selected date's month for summary context
    const dateInput = document.getElementById('selectedDate').value;
    // Safe parsing for context
    const dateParts = dateInput.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);

    // First and Last day
    const start_date = `${year}-${String(month).padStart(2, '0')}-01`;
    // Last day trick: Day 0 of next month
    const lastDay = new Date(year, month, 0).getDate();
    const end_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    try {
        const response = await fetch(`/api/attendance/summary?start_date=${start_date}&end_date=${end_date}`);
        if (!response.ok) throw new Error('Sunucu yanıt vermedi');

        const data = await response.json();

        // Update Title context
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const titleEl = document.getElementById('summaryTitle');
        if (titleEl) titleEl.textContent = `📊 Aylık Çalışma Özeti (${monthNames[month - 1]} ${year})`;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-muted text-center col-span-4" style="grid-column: span 4;">Kayıt bulunamadı</p>';
            return;
        }

        container.innerHTML = data.map(item => {
            const icon = item.role === 'manager' ? '👑' : item.role === 'supervisor' ? '👷' : '👤';
            const roleName = item.role === 'manager' ? 'Yönetici' : item.role === 'supervisor' ? 'Ustabaşı' : 'Personel';

            return `
            <div class="card" style="display: flex; flex-direction: row; align-items: center; padding: 16px; gap: 16px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 2rem; background: #f3f4f6; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                    ${icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.05rem; color: #111827;">${item.full_name}</div>
                    <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 4px;">${roleName}</div>
                    <div style="font-size: 0.9rem; color: #374151;">
                        <strong>${item.total_days} Gün</strong> Çalıştı
                        ${item.total_overtime > 0 ? `<span class="text-warning" style="font-size: 0.8rem; margin-left: 6px;">(+${item.total_overtime}s Mesai)</span>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Özet yükleme hatası:', error);
        container.innerHTML = '<p class="text-danger text-center col-span-4">Veri yüklenemedi</p>';
    }
}

async function logout() {
    try {
        localStorage.removeItem('user_cache');
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        window.location.href = '/index.html';
    }
}

let employees = [];
let attendanceRecords = {};

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
        showAlert('Personel listesi yüklenemedi', 'error');
    }
}

// Load attendance for selected date
async function loadAttendance() {
    const date = document.getElementById('selectedDate').value;
    if (!date) {
        showAlert('Lütfen tarih seçin', 'warning');
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
        showAlert('Veri yüklenirken hata oluştu', 'error');
    }
}

// Change date by offset (days) - TIMEZONE SAFE
function changeDate(offset) {
    const dateInput = document.getElementById('selectedDate');
    if (!dateInput.value) return;

    // Use noon to avoid DST/Timezone midnight edge cases
    const parts = dateInput.value.split('-');
    const currentDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

    currentDate.setDate(currentDate.getDate() + offset);

    // Format YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    dateInput.value = `${year}-${month}-${day}`;
    loadAttendance();
    loadSummary();
}

// Render attendance table
function renderAttendance(date) {
    const tbody = document.getElementById('attendanceList');
    document.getElementById('dateTitle').textContent = `${formatDate(date)} - Çalışma Kaydı`;

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aktif personel bulunamadı</td></tr>';
        return;
    }

    // Collect all unique locations from today's records for autocomplete
    const uniqueLocations = [];
    Object.values(attendanceRecords).forEach(r => {
        if (r.location && r.location.trim() !== '') {
            r.location.split(',').forEach(loc => {
                const trimmed = loc.trim();
                // Avoid duplicates
                if (trimmed && !uniqueLocations.includes(trimmed)) {
                    uniqueLocations.push(trimmed);
                }
            });
        }
    });

    const datalistHtml = `
        <datalist id="locationSuggestions">
            ${uniqueLocations.map(loc => `<option value="${loc}">`).join('')}
        </datalist>
    `;

    // Append datalist to body if not exists, or update it
    let datalistContainer = document.getElementById('datalistContainer');
    if (!datalistContainer) {
        datalistContainer = document.createElement('div');
        datalistContainer.id = 'datalistContainer';
        document.body.appendChild(datalistContainer);
    }
    datalistContainer.innerHTML = datalistHtml;

    tbody.innerHTML = employees.map((emp, index) => {
        const record = attendanceRecords[emp.id] || {};
        // hours_worked now represents OVERTIME. Default to 0 if not present.
        const overtime = record.hours_worked || 0;
        const locationTags = record.location || '';

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
                            class="input-small no-spinners"
                            style="width: 60px; text-align: center;"
                            ${!record.worked ? 'disabled' : ''}>
                        <div style="display: flex; gap: 3px;">
                            <button class="btn-icon" onclick="resetOvertime(${emp.id})" title="Sıfırla" ${!record.worked ? 'disabled' : ''} style="color: #ef4444; font-weight: bold; width: 32px; height: 32px; border: 1px solid #fee2e2; background: #fef2f2;">↻</button>
                            <button class="btn-icon" onclick="addOvertime(${emp.id}, -1)" title="Azalt" ${!record.worked ? 'disabled' : ''} style="font-weight: bold; width: 32px; height: 32px; border: 1px solid #e5e7eb;">−</button>
                            <button class="btn-icon" onclick="addOvertime(${emp.id}, 1)" title="Artır" ${!record.worked ? 'disabled' : ''} style="font-weight: bold; width: 32px; height: 32px; border: 1px solid #e5e7eb;">+</button>
                        </div>
                    </div>
                </td>
                <td>
                    <!-- Tag Input Logic Replacement -->
                    <div id="location-container-${emp.id}" style="width: 100%; min-width: 200px;">
                        ${renderTagsInput(emp.id, locationTags, !record.worked)}
                    </div>
                    <!-- Hidden input to store value for easier POST -->
                    <input type="hidden" id="location_${emp.id}" value="${locationTags}">
                </td>
                <td>
                    <textarea 
                        id="notes_${emp.id}" 
                        class="input-small type-notes"
                        placeholder="Notlar"
                        rows="1"
                        style="width: 100%; resize: none; overflow: hidden; min-height: 38px; padding-top: 8px;"
                        oninput="autoResizeTextarea(this)">${record.notes || ''}</textarea>
                </td>
            </tr>
        `;
    }).join('');

    // Trigger resize for existing content
    setTimeout(() => {
        document.querySelectorAll('textarea.type-notes').forEach(el => autoResizeTextarea(el));
    }, 100);
}

// Auto-resize textarea
function autoResizeTextarea(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}


// --- Tag Input Functions ---

function renderTagsInput(empId, currentTagsString, isDisabled = false) {
    const tags = currentTagsString ? currentTagsString.split(',').map(s => s.trim()).filter(s => s) : [];

    // Style check: use .tag-container logic if CSS exists, otherwise inline fallback
    return `
        <div class="tag-container ${isDisabled ? 'disabled' : ''}" 
             style="display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; background: ${isDisabled ? '#f3f4f6' : '#fff'}; align-items: center; min-height: 38px;">
            ${tags.map((tag, index) => `
                <div class="tag" style="background: #e5e7eb; padding: 1px 6px; border-radius: 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; border: 1px solid #d1d5db; height: 24px;">
                    ${tag}
                    ${!isDisabled ? `<span class="tag-remove" onclick="removeLocationTag(${empId}, ${index})" style="cursor: pointer; color: #666; font-weight: bold; line-height: 1; display: flex; height: 100%; align-items: center; padding-bottom: 2px;">×</span>` : ''}
                </div>
            `).join('')}
            <input 
                type="text" 
                id="tag-input-${empId}" 
                class="tag-input-field" 
                placeholder="${tags.length > 0 ? '' : 'Konum / Görev ekle...'}" 
                style="border: none; outline: none; flex: 1; min-width: 60px; padding: 2px 4px; background: transparent; height: 28px; font-size: 0.9rem;"
                list="locationSuggestions"
                onkeydown="handleTagKeydown(event, ${empId})"
                oninput="handleTagInput(event, ${empId})"
                onblur="handleTagBlur(${empId})"
                ${isDisabled ? 'disabled' : ''}
            >
        </div>
    `;
}

function handleTagInput(event, empId) {
    const input = event.target;
    const value = input.value.trim();
    if (!value) return;

    // Direct match check for datalist auto-add
    const list = document.getElementById('locationSuggestions');
    if (list && list.options) {
        let match = false;
        for (let i = 0; i < list.options.length; i++) {
            // Case insensitive check
            if (list.options[i].value.toLowerCase() === value.toLowerCase()) {
                match = true;
                break;
            }
        }
        if (match) {
            setTimeout(() => {
                addLocationTag(empId, value);
                input.value = '';
                input.focus();
            }, 50); // Small delay to feel natural
        }
    }
}

function handleTagKeydown(event, empId) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        event.stopPropagation();
        const input = event.target;
        const value = input.value.trim();

        if (value) {
            addLocationTag(empId, value);
            input.value = '';
            input.focus();
        }
    }
    // Backspace to remove last tag if input is empty
    if (event.key === 'Backspace' && event.target.value === '') {
        const hiddenInput = document.getElementById(`location_${empId}`);
        let currentString = hiddenInput ? hiddenInput.value : '';
        let tags = currentString ? currentString.split(',').map(s => s.trim()).filter(s => s) : [];
        if (tags.length > 0) {
            removeLocationTag(empId, tags.length - 1);
        }
    }
}

function handleTagBlur(empId) {
    const input = document.getElementById(`tag-input-${empId}`);
    if (input && input.value.trim()) {
        addLocationTag(empId, input.value.trim());
        input.value = '';
    }
}

function addLocationTag(empId, newTag) {
    // Sanitize tag (remove commas since they are delimiters)
    const cleanTag = newTag.replace(/,/g, '');
    if (!cleanTag) return;

    const hiddenInput = document.getElementById(`location_${empId}`);
    let currentString = hiddenInput.value;
    let tags = currentString ? currentString.split(',').map(s => s.trim()).filter(s => s) : [];

    // Prevent exact duplicates?
    if (!tags.includes(cleanTag)) {
        tags.push(cleanTag);
    }

    updateLocationTagsUI(empId, tags);

    // Also update global Datalist with new Location for other users
    updateDatalist(cleanTag);
}

function removeLocationTag(empId, indexToRemove) {
    const hiddenInput = document.getElementById(`location_${empId}`);
    let currentString = hiddenInput.value;
    let tags = currentString ? currentString.split(',').map(s => s.trim()).filter(s => s) : [];

    if (indexToRemove >= 0 && indexToRemove < tags.length) {
        tags.splice(indexToRemove, 1);
        updateLocationTagsUI(empId, tags);
    }
}

function updateLocationTagsUI(empId, tags) {
    const hiddenInput = document.getElementById(`location_${empId}`);
    const newString = tags.join(',');
    hiddenInput.value = newString;

    // Re-render the container
    const container = document.getElementById(`location-container-${empId}`);
    if (container) {
        // Find if input was disabled? Checking worked status.
        const worked = document.getElementById(`worked_${empId}`).checked;
        container.innerHTML = renderTagsInput(empId, newString, !worked);

        // Refocus
        setTimeout(() => {
            const input = document.getElementById(`tag-input-${empId}`);
            if (input) input.focus();
        }, 10);
    }
}

// Update datalist dynamically (global list)
function updateDatalist(newValue) {
    if (!newValue || newValue.trim() === '') return;

    const datalist = document.getElementById('locationSuggestions');
    if (!datalist) return;

    // Check if already exists
    let exists = false;
    for (let i = 0; i < datalist.options.length; i++) {
        if (datalist.options[i].value === newValue) {
            exists = true;
            break;
        }
    }

    if (!exists) {
        const option = document.createElement('option');
        option.value = newValue;
        datalist.appendChild(option);
    }
}

// Toggle worked checkbox
function toggleWorked(empId) {
    const worked = document.getElementById(`worked_${empId}`).checked;

    // Toggle Overtime Inputs
    document.getElementById(`hours_${empId}`).disabled = !worked;
    const buttons = document.querySelectorAll(`button[onclick*="${empId}"]`);
    buttons.forEach(btn => btn.disabled = !worked);

    // Toggle Location Input (Re-render with disabled state)
    const hiddenInput = document.getElementById(`location_${empId}`);
    if (hiddenInput) {
        const container = document.getElementById(`location-container-${empId}`);
        container.innerHTML = renderTagsInput(empId, hiddenInput.value, !worked);
    }

    if (!worked) {
        document.getElementById(`hours_${empId}`).value = 0;
    } else {
        const currentVal = parseFloat(document.getElementById(`hours_${empId}`).value) || 0;
        if (currentVal === 8) {
            document.getElementById(`hours_${empId}`).value = 0;
        }
    }
}

// Add OVERTIME hours
function addOvertime(empId, hours) {
    const input = document.getElementById(`hours_${empId}`);
    const currentValue = parseFloat(input.value) || 0;
    let newValue = currentValue + hours;

    // Bounds Check
    if (newValue < 0) newValue = 0;
    if (newValue > 24) newValue = 24; // Physical limit of a day

    input.value = newValue;
}

// Reset OVERTIME to 0
function resetOvertime(empId) {
    document.getElementById(`hours_${empId}`).value = 0;
}

// Set Full Day OVERTIME (Assuming 8 hours or standard shift)
function setFullDayOvertime(empId) {
    document.getElementById(`hours_${empId}`).value = 8;
}

// Copy Location from the row above (SMART COPY)
// IMPORTANT: With Tag Input, we copy the RAW string
function copyLocationFromAbove(currentIndex) {
    // This functionality is REMOVED as per user request
    // "konum görev kısmındaki oku emojisine gerek yok"
    // So this function is likely unused or can be removed.
    // I will keep it commented out or just remove calls to it.
    // The render function no longer generates the button.
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
        // With Tag Input, the value is in the hidden input
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

        showAlert('Tüm kayıtlar başarıyla kaydedildi!', 'success');
        loadAttendance();
        loadSummary();
    } catch (error) {
        console.error('Hata:', error);
        showAlert('Kayıt sırasında hata oluştu', 'error');
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
