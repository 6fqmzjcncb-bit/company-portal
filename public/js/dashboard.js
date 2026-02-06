// Auth & UI Cache
async function checkAuth() {
    // 1. Try to load from cache immediately to prevent flicker
    const cachedUser = localStorage.getItem('user_cache');
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            updateUserInterface(user);
        } catch (e) {
            console.error('Cache parse error', e);
        }
    }

    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            localStorage.removeItem('user_cache'); // Clear invalid cache
            window.location.href = '/index.html';
            return null;
        }
        const user = await response.json();

        // 2. Update cache and UI with fresh data
        localStorage.setItem('user_cache', JSON.stringify(user));
        updateUserInterface(user);

        return user;
    } catch (error) {
        // If network error, maybe rely on cache? 
        // For security, if we can't verify, we might redirect, but for flicker fix, we let it be if cached.
        // But if it's a 401 it would be caught above. Network error implies offline?
        // Let's redirect to be safe if no cache, or if cache exists maybe let them stay?
        // Standard behavior: Redirect on error.
        if (!cachedUser) {
            window.location.href = '/index.html';
        }
        return null;
    }
}

function updateUserInterface(user) {
    if (!user) return;

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const adminLink = document.getElementById('adminLink');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    // Admin linkini göster
    if (user.role === 'admin' && adminLink) {
        adminLink.style.display = 'block';
    }
}

// Logout
async function logout() {
    try {
        localStorage.removeItem('user_cache'); // Clear cache
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/index.html';
    }
}

// Kullanıcı bilgilerini yükle
async function loadUserInfo() {
    await checkAuth();
}

// İstatistikleri yükle
async function loadStats() {
    try {
        const response = await fetch('/api/jobs');
        const jobs = await response.json();

        document.getElementById('totalJobs').textContent = jobs.length;
        document.getElementById('completedJobs').textContent =
            jobs.filter(j => j.status === 'completed').length;
        document.getElementById('pendingJobs').textContent =
            jobs.filter(j => j.status === 'pending').length;

    } catch (error) {
        console.error('Stats load error:', error);
    }
}

// Son iş listelerini yükle
async function loadRecentJobs() {
    try {
        const response = await fetch('/api/jobs');
        const jobs = await response.json();

        const recentJobs = jobs.slice(0, 5);
        const container = document.getElementById('recentJobs');

        if (recentJobs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Henüz iş listesi yok</p>';
            return;
        }

        const statusColors = {
            pending: 'warning',
            processing: 'primary',
            completed: 'success'
        };

        const statusLabels = {
            pending: 'Bekliyor',
            processing: 'İşlemde',
            completed: 'Tamamlandı'
        };

        container.innerHTML = recentJobs.map(job => `
      <div class="job-item">
        <div class="item-info">
          <div class="item-name">${job.title}</div>
          <div class="item-meta">
            ${new Date(job.created_at).toLocaleDateString('tr-TR')} - 
            ${job.creator.full_name}
          </div>
        </div>
        <div class="item-actions">
          <span class="badge badge-${statusColors[job.status]}">
            ${statusLabels[job.status]}
          </span>
          <a href="/job-detail.html?id=${job.id}" class="btn btn-primary btn-sm">
            Detay
          </a>
        </div>
      </div>
    `).join('');

    } catch (error) {
        console.error('Recent jobs load error:', error);
        document.getElementById('recentJobs').innerHTML =
            '<p class="text-muted text-center">Yüklenemedi</p>';
    }
}

// Sayfa yüklendiğinde
window.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadStats();
    loadRecentJobs();
});
