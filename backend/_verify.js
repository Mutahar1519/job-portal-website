(async () => {
  const tests = [];
  const check = async (name, url, method='GET', body=null) => {
    try {
      const opts = {method, headers: {'Content-Type': 'application/json'}};
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(url, opts);
      const text = await r.text();
      tests.push({name, status: r.status, ok: r.ok ? 'PASS' : 'FAIL'});
      return {status: r.status, text};
    } catch(e) {
      tests.push({name, status: 0, ok: 'FAIL', error: e.message});
      return {status: 0, text: e.message};
    }
  };

  const base = 'http://localhost:3000';
  
  console.log('Testing Core Features...\n');
  
  // Core endpoints
  await check('health', base + '/api/health');
  await check('jobs-list', base + '/api/jobs');
  await check('auth-providers', base + '/api/auth/providers');
  
  // Auth flows
  const admin = await check('admin-login', base + '/api/users/login', 'POST', {email:'admin@demo.local', password:'Demo@1234'});
  const employer = await check('employer-login', base + '/api/users/login', 'POST', {email:'emma@demo.local', password:'Demo@1234'});
  const seeker = await check('seeker-login', base + '/api/users/login', 'POST', {email:'alice@demo.local', password:'Demo@1234'});
  
  // Get tokens
  const adminData = admin.status === 200 ? JSON.parse(admin.text) : {};
  const employerData = employer.status === 200 ? JSON.parse(employer.text) : {};
  const seekerData = seeker.status === 200 ? JSON.parse(seeker.text) : {};
  
  const adminToken = adminData.token;
  const employerToken = employerData.token;
  const seekerToken = seekerData.token;
  
  // Protected endpoints with auth
  const checkAuth = async (name, url, token) => {
    const opts = {method: 'GET', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}};
    const r = await fetch(url, opts);
    tests.push({name, status: r.status, ok: r.ok ? 'PASS' : 'FAIL'});
  };
  
  if (adminToken) await checkAuth('admin-reviews', base + '/api/admin/reviews?source=all', adminToken);
  if (employerToken) await checkAuth('employer-stats', base + '/api/employer/stats', employerToken);
  if (seekerToken) await checkAuth('seeker-applications', base + '/api/applications/my', seekerToken);
  
  // New features
  await check('company-reviews-get', base + '/api/reviews/company/1');
  await check('job-detail-api', base + '/api/jobs/1');
  
  console.log('\n=== FEATURE VERIFICATION ===');
  tests.forEach(t => {
    const mark = t.ok === 'PASS' ? '✓' : '✗';
    console.log(mark + ' ' + t.name + ' -> ' + t.status);
  });
  
  const passCount = tests.filter(t => t.ok === 'PASS').length;
  console.log('\n' + passCount + '/' + tests.length + ' checks passed\n');
  
  if (passCount === tests.length) {
    console.log('✅ STATUS: ALL SYSTEMS GO - Portal is 100% ready for demo');
  } else {
    console.log('⚠️  STATUS: Some features may need attention');
  }
})().catch(e => console.error(e));
