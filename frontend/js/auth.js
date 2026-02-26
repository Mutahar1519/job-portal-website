/* ===================================
   auth.js – authentication helpers
   =================================== */

function saveUser(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/frontend/index.html';
}

function requireAuth(redirectTo = '/frontend/login.html') {
  if (!getToken()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

function requireRole(role, redirectTo = '/frontend/index.html') {
  const user = getUser();
  if (!user || user.role !== role) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Update navbar based on auth state
function updateNavbar() {
  const user = getUser();
  const authLinks = document.getElementById('auth-links');
  if (!authLinks) return;

  if (user) {
    authLinks.innerHTML = `
      <a href="/frontend/dashboard.html">👤 ${user.name}</a>
      ${user.role === 'employer' ? '<a href="/frontend/post-job.html">Post a Job</a>' : ''}
      <a href="#" onclick="logout(); return false;" class="btn-nav">Logout</a>
    `;
  } else {
    authLinks.innerHTML = `
      <a href="/frontend/login.html" class="nav-hide-sm">Login</a>
      <a href="/frontend/register.html" class="btn-nav">Sign Up</a>
    `;
  }
}

// Show alert message inside a container element
function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Format a date string
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Badge HTML for job type
function jobTypeBadge(type) {
  const map = {
    'full-time':  'badge-full-time',
    'part-time':  'badge-part-time',
    'contract':   'badge-contract',
    'internship': 'badge-internship',
    'remote':     'badge-remote',
  };
  const cls = map[type] || '';
  return `<span class="job-badge ${cls}">${type}</span>`;
}

// Salary display
function formatSalary(salary) {
  if (!salary || (!salary.min && !salary.max)) return '';
  const fmt = (n) => n ? `${salary.currency || 'USD'} ${Number(n).toLocaleString()}` : '';
  if (salary.min && salary.max) return `${fmt(salary.min)} – ${fmt(salary.max)}`;
  return fmt(salary.min || salary.max);
}
