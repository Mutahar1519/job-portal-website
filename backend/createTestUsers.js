// helper to seed three users: admin, employer, job seeker
const db = require('./config/mysql');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    const users = [
      { email: 'admin@test.com', name: 'Admin User', role: 'admin', is_admin: 1 },
      { email: 'employer@test.com', name: 'Employer User', role: 'employer' },
      { email: 'seeker@test.com', name: 'Job Seeker', role: 'job_seeker' }
    ];

    for (const u of users) {
      const [rows] = await new Promise((res, rej) => db.query(
        'SELECT id FROM users WHERE email = ?', [u.email],
        (err, r) => err ? rej(err) : res([r])
      ));
      if (rows.length) {
        console.log('User already exists:', u.email);
        continue;
      }
      const result = await new Promise((res, rej) => db.query(
        `INSERT INTO users (name,email,password,role,verified,is_admin) VALUES (?,?,?,?,1,?)`,
        [u.name, u.email, hash, u.role, u.is_admin || 0],
        (err, r) => err ? rej(err) : res(r)
      ));
      console.log('Created user', u.email, 'id', result.insertId);
      if (u.role === 'employer') {
        // create company
        await new Promise((res, rej) => db.query(
          'INSERT INTO companies (owner_user_id, name) VALUES (?,?)',
          [result.insertId, 'Demo Co'],
          (err) => err ? rej(err) : res()
        ));
      }
      if (u.role === 'job_seeker') {
        await new Promise((res, rej) => db.query(
          'INSERT INTO job_seeker_profiles (user_id) VALUES (?)',
          [result.insertId],
          (err) => err ? rej(err) : res()
        ));
      }
    }
    console.log('Test users seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Error creating test users', err);
    process.exit(1);
  }
})();
