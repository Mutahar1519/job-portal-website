/* ===================================
   main.js – Job listings page logic
   =================================== */

let currentPage = 1;
const LIMIT = 9;

async function loadJobs(page = 1) {
  const search   = document.getElementById('search-input')?.value.trim() || '';
  const location = document.getElementById('filter-location')?.value.trim() || '';
  const jobType  = document.getElementById('filter-type')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';

  const params = { page, limit: LIMIT };
  if (search)   params.search   = search;
  if (location) params.location = location;
  if (jobType)  params.jobType  = jobType;
  if (category) params.category = category;

  const grid = document.getElementById('job-grid');
  grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Loading jobs…</p>';

  try {
    const data = await Jobs.getAll(params);
    currentPage = data.page;
    renderJobs(data.jobs);
    renderPagination(data.page, data.pages);
    document.getElementById('results-count').textContent =
      `${data.total} job${data.total !== 1 ? 's' : ''} found`;
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem">${err.message}</p>`;
  }
}

function renderJobs(jobs) {
  const grid = document.getElementById('job-grid');
  if (!jobs.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🔍</div>
        <p>No jobs match your search. Try different filters.</p>
      </div>`;
    return;
  }
  grid.innerHTML = jobs.map(job => `
    <div class="job-card">
      <div class="job-card-header">
        <h3>${escHtml(job.title)}</h3>
        ${jobTypeBadge(job.jobType)}
      </div>
      <div class="company">🏢 ${escHtml(job.company)}</div>
      <div class="location">${escHtml(job.location)}</div>
      ${job.salary ? `<div class="salary">💰 ${formatSalary(job.salary)}</div>` : ''}
      <div class="description">${escHtml(job.description)}</div>
      <div class="job-card-footer">
        <span class="date">${formatDate(job.createdAt)}</span>
        <a href="/frontend/job-detail.html?id=${job._id}" class="btn btn-outline btn-sm">View Job</a>
      </div>
    </div>
  `).join('');
}

function renderPagination(page, pages) {
  const el = document.getElementById('pagination');
  if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }

  let html = `<button ${page === 1 ? 'disabled' : ''} onclick="goPage(${page - 1})">‹ Prev</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button ${page === pages ? 'disabled' : ''} onclick="goPage(${page + 1})">Next ›</button>`;
  el.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  loadJobs(p);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  loadJobs(1);

  document.getElementById('search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    loadJobs(1);
  });
  document.getElementById('filter-type')?.addEventListener('change', () => loadJobs(1));
  document.getElementById('filter-category')?.addEventListener('change', () => loadJobs(1));
});
