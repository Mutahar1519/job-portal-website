const fs = require('fs');
const fixes = [
  { f: 'frontend/js/job-detail.js', o: 'showSuccess(data.message || "Failed to update saved job")', n: 'showError(data.message || "Failed to update saved job")' },
  { f: 'frontend/js/job-detail.js', o: 'showSuccess("Failed to update saved job")', n: 'showError("Failed to update saved job")' },
  { f: 'frontend/js/job-detail.js', o: 'showError("Job link copied to clipboard")', n: 'showSuccess("Job link copied to clipboard")' },
  { f: 'frontend/js/jobs-search.js', o: 'showSuccess(data.message || "Failed to update saved job")', n: 'showError(data.message || "Failed to update saved job")' },
  { f: 'frontend/js/jobs-search.js', o: 'showSuccess("Failed to update saved job")', n: 'showError("Failed to update saved job")' },
  { f: 'frontend/js/latest-jobs.js', o: 'showSuccess(data.message || "Failed to update saved job")', n: 'showError(data.message || "Failed to update saved job")' },
  { f: 'frontend/js/latest-jobs.js', o: 'showSuccess("Failed to update saved job")', n: 'showError("Failed to update saved job")' },
];
for (const { f, o, n } of fixes) {
  let c = fs.readFileSync(f, 'utf8');
  const c2 = c.split(o).join(n);
  if (c2 !== c) {
    fs.writeFileSync(f, c2, 'utf8');
    console.log('Fixed:', f, '-', o.substring(0, 50));
  } else {
    console.log('NO MATCH:', f, '-', o.substring(0, 50));
  }
}
