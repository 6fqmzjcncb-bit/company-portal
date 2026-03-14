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

        container.innerHTML = recentJobs.map(job => {
            const viewersText = job.recent_viewers && job.recent_viewers.length > 0
                ? job.recent_viewers.map(v => v.full_name).join(', ')
                : 'Henüz kimse bakmadı';

            return `
      <div class="job-item" style="display: block; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; margin-bottom: 12px; background: white; border: 1px solid #e5e7eb;">
        <div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f3f4f6;">
          <div>
            <div style="font-weight: 700; color: #1f2937; margin-bottom: 4px;">${job.title}</div>
            <div style="font-size: 0.85rem; color: #6b7280;">
              ${new Date(job.created_at).toLocaleDateString('tr-TR')} - ${job.creator.full_name}
            </div>
          </div>
          <span class="badge badge-${statusColors[job.status]}">
            ${statusLabels[job.status]}
          </span>
        </div>
        
        <div style="padding: 12px 16px;">
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; padding: 0;">
              <span style="color: #4b5563;"><strong>Tamamlanma:</strong></span>
              <span style="color: #4b5563;"><strong>%${job.completion_percentage || 0}</strong></span>
            </div>
            <div style="background: #e5e7eb; height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="background: #059669; height: 100%; width: ${job.completion_percentage || 0}%; transition: width 0.3s;"></div>
            </div>
          </div>
          <div style="font-size: 0.8rem; color: #6b7280; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span>👁️ ${viewersText}</span>
            <a href="/job-detail.html?id=${job.id}&title=${encodeURIComponent(job.title)}" class="btn btn-primary btn-sm" style="margin: 0;">Detay Gör</a>
          </div>
        </div>
      </div>
    `;
        }).join('');

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
