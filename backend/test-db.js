require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

db.connect((err) => {
  if (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to MySQL server');

    db.query('SHOW DATABASES LIKE "job_portal"', (err, results) => {
      if (err) {
        console.error('Query failed:', err.message);
        process.exit(1);
      }

      if (results.length > 0) {
        console.log('Database job_portal exists');
      } else {
        console.log('Database job_portal does not exist, creating...');
        db.query('CREATE DATABASE job_portal', (err) => {
          if (err) {
            console.error('Database creation failed:', err.message);
            process.exit(1);
          } else {
            console.log('Database job_portal created');
          }
          db.end();
        });
      }

      if (results.length > 0) {
        db.end();
      }
    });
  }
});