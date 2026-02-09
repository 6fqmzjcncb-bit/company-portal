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
