const apiPort = "3000";
const pageProtocol = window.location.protocol;
const isHttpProtocol = pageProtocol === "http:" || pageProtocol === "https:";
const requestProtocol = isHttpProtocol ? pageProtocol : "http:";
const apiHost = window.location.hostname || "localhost";
const isLocalHost = apiHost === "localhost" || apiHost === "127.0.0.1";
const apiOrigin = isLocalHost
  ? `${requestProtocol}//${apiHost}:${apiPort}`
  : (isHttpProtocol ? window.location.origin : `${requestProtocol}//${apiHost}:${apiPort}`);
const API = `${apiOrigin}/api`;


// eslint-disable-next-line no-var
var authFetch = function(url, options = {}) {
  const token = localStorage.getItem("token");
  // Do NOT set Content-Type for FormData — browser must set it with the multipart boundary
  const isFormData = options.body instanceof FormData;
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
  });
};
window.authFetch = authFetch;
