/* ===================================
   api.js – centralised API helpers
   =================================== */
const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Auth
const Auth = {
  register: (payload) => apiRequest('/auth/register', 'POST', payload),
  login:    (payload) => apiRequest('/auth/login',    'POST', payload),
  getMe:    ()        => apiRequest('/auth/me'),
  updateProfile: (payload) => apiRequest('/auth/profile', 'PUT', payload),
};

// Jobs
const Jobs = {
  getAll:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/jobs?${qs}`);
  },
  getOne:  (id)     => apiRequest(`/jobs/${id}`),
  getMy:   ()       => apiRequest('/jobs/my'),
  create:  (payload) => apiRequest('/jobs', 'POST', payload),
  update:  (id, payload) => apiRequest(`/jobs/${id}`, 'PUT', payload),
  remove:  (id)     => apiRequest(`/jobs/${id}`, 'DELETE'),
};

// Applications
const Applications = {
  apply:    (payload)  => apiRequest('/applications', 'POST', payload),
  getMy:    ()         => apiRequest('/applications/my'),
  forJob:   (jobId)    => apiRequest(`/applications/job/${jobId}`),
  setStatus:(id, status) => apiRequest(`/applications/${id}/status`, 'PUT', { status }),
};
