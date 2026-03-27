const apiPort = "3000";

const getDefaultApiOrigin = () => {
  if (window.location.protocol === "file:") {
    return `http://localhost:${apiPort}`;
  }

  const host = window.location.hostname || "localhost";
  const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host);

  if (isLocalHost) {
    return `http://localhost:${apiPort}`;
  }

  // Use same host for production deployments where backend and frontend share origin
  return `${window.location.protocol}//${window.location.host}`;
};

// Base origin for asset URLs (images, uploads, etc.) — no /api suffix
const apiOrigin = getDefaultApiOrigin();
const API = `${apiOrigin}/api`;

window.authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");
  // Do NOT set Content-Type for FormData — browser must set it with the multipart boundary
  const isFormData = options.body instanceof FormData;
  const method = String(options.method || "GET").toUpperCase();
  const shouldSetJsonContentType = !isFormData && options.body != null && method !== "GET" && method !== "HEAD";

  // Only add Authorization header if token exists and is not empty
  const headers = {
    ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(token && token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
};
