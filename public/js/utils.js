// Utility functions for the application

// Generic Modal Alert
function showAlert(message, type = 'info', title = null) {
    // Ensure modal exists
    if (!document.getElementById('globalAlertModal')) {
        createAlertModalDOM();
    }

    const modal = document.getElementById('globalAlertModal');
    const titleEl = document.getElementById('globalAlertTitle');
    const messageEl = document.getElementById('globalAlertMessage');
    const iconEl = document.getElementById('globalAlertIcon');

    // Set content
    messageEl.textContent = message;

    // Set Title & Icon based on type
    if (title) {
        titleEl.textContent = title;
    } else {
        switch (type) {
            case 'success':
                titleEl.textContent = 'Başarılı';
                iconEl.textContent = '✅';
                break;
            case 'error':
                titleEl.textContent = 'Hata';
                iconEl.textContent = '❌';
                break;
            case 'warning':
                titleEl.textContent = 'Uyarı';
                iconEl.textContent = '⚠️';
                break;
            default:
                titleEl.textContent = 'Bilgi';
                iconEl.textContent = 'ℹ️';
        }
    }

    // Show
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAlertModal() {
    const modal = document.getElementById('globalAlertModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function createAlertModalDOM() {
    const modalHtml = `
    <div id="globalAlertModal" class="modal" style="z-index: 9999;">
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 10px;" id="globalAlertIcon">ℹ️</div>
            <h2 class="modal-title" id="globalAlertTitle" style="justify-content: center; margin-bottom: 10px;">Bilgi</h2>
            <p id="globalAlertMessage" style="font-size: 1.1rem; color: #4b5563; margin-bottom: 25px; line-height: 1.5;"></p>
            <div class="modal-actions" style="justify-content: center;">
                <button type="button" class="btn btn-primary" onclick="closeAlertModal()" style="min-width: 120px;">Tamam</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Override native alert (Optional, but ensures catch-all)
// window.alert = function(msg) { showAlert(msg); }; 
// Better to be explicit for now as window.alert is blocking and showAlert is async/non-blocking UI. 
// Replacing specific calls is safer to control flow.
// Toast Notification System
function showToast(message, type = 'success') {
    // Create container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container); // Append to body (top-level)
    }

    // Icon mapping
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
    `;

    // Add to container
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, 3000);
}

// Capitalize Unit
function capitalizeUnit(unit) {
    if (!unit) return '';
    return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
}

// Date Formatting
function formatDateTime(dateString) {
    if (!dateString) return '-';

    // Check if it's already formatted (simple check)
    if (dateString.includes('Şubat') || dateString.includes('Ocak')) return dateString;

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Invalid date

        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (e) {
        console.error('Date parsing error:', e);
        return dateString;
    }
}

// ===========================
// MOBILE SIDEBAR LOGIC
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Overlay if not exists
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        // Close on Overlay Click
        overlay.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // 2. Setup Toggle Button
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    // Re-select overlay to be sure
    const overlay = document.querySelector('.sidebar-overlay');

    console.log('📱 Mobile Menu Init:', {
        btn: !!toggleBtn,
        sidebar: !!sidebar,
        overlay: !!overlay
    });

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.onclick = (e) => { // Use onclick for direct attachment
            console.log('🍔 Menu Button Clicked');
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            console.log('Sidebar Active:', sidebar.classList.contains('active'));
        };
    } else {
        console.error('❌ Mobile Menu Elements Missing!');
    }

    // 3. Swipe to Close (Optional Simple Touch)
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) { // Swipe Left
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        }
    }
});
