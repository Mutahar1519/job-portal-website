const apiPort = "3000";
const apiHost = window.location.hostname || "localhost";
const isLocalHost = apiHost === "localhost" || apiHost === "127.0.0.1";
const apiOrigin = isLocalHost
  ? `${window.location.protocol}//${apiHost}:${apiPort}`
  : window.location.origin;
const API = `${apiOrigin}/api`;


window.authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
};
