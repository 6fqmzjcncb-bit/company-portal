// Auth kontrol
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

// Logout
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/index.html';
    }
}

// Kullanıcı bilgilerini yükle
async function loadUserInfo() {
    const user = await checkAuth();
    if (!user) return;

    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('userRole').textContent =
        user.role === 'admin' ? '👑 Yönetici' : '👤 Personel';

    // Admin linkini göster
    if (user.role === 'admin') {
        document.getElementById('adminLink').style.display = 'block';
    }
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
