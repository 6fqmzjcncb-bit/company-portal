// Yardımcı fonksiyonlar
function showAlert(message, type = 'error') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.innerHTML = '';
    container.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.disabled = true;
    loginBtn.textContent = 'Giriş yapılıyor...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAlert(data.error || 'Giriş başarısız', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Giriş Yap';
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Sunucuya bağlanılamadı', 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Giriş Yap';
    }
});
