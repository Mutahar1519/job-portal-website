export async function authFetch(url, options = {}) {
<script src="js/config.js"></script>

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
}
authFetch("http://localhost:3000/jobs", {
  method: "POST",
  body: JSON.stringify(jobData)
});
authFetch(`http://localhost:3000/jobs/${jobId}`)
  .then(res => res.json());
