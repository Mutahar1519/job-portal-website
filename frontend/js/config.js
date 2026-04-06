const apiPort = "3000";
<<<<<<< HEAD
const pageProtocol = window.location.protocol;
const isHttpProtocol = pageProtocol === "http:" || pageProtocol === "https:";
const requestProtocol = isHttpProtocol ? pageProtocol : "http:";
const apiHost = window.location.hostname || "localhost";
const isLocalHost = apiHost === "localhost" || apiHost === "127.0.0.1";
const apiOrigin = isLocalHost
  ? `${requestProtocol}//${apiHost}:${apiPort}`
  : (isHttpProtocol ? window.location.origin : `${requestProtocol}//${apiHost}:${apiPort}`);
const API = `${apiOrigin}/api`;
=======
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0

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

// eslint-disable-next-line no-var
var authFetch = function(url, options = {}) {
  const token = localStorage.getItem("token");
  // Do NOT set Content-Type for FormData — browser must set it with the multipart boundary
  const isFormData = options.body instanceof FormData;
<<<<<<< HEAD
<<<<<<< HEAD
  const method = String(options.method || "GET").toUpperCase();
  const shouldSetJsonHeader = !isFormData && !["GET", "HEAD"].includes(method);
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7

  return fetch(url, {
    ...options,
    headers: {
<<<<<<< HEAD
      ...(shouldSetJsonHeader ? { "Content-Type": "application/json" } : {}),
=======
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
=======
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
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
  });
};
window.authFetch = authFetch;
