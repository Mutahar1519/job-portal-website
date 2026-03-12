const fs = require('fs');
const path = require('path');
const db = require('./config/mysql');

// this script drops and recreates the database from the canonical schema file
// usage: node initDb.js

const schemaPath = path.join(__dirname, 'sql', 'job_portal_full_schema.sql');
let sql = fs.readFileSync(schemaPath, 'utf-8');

// ensure a clean slate by dropping the database first
sql = `DROP DATABASE IF EXISTS job_portal;\n` + sql;

console.log('Initializing database from', schemaPath);

// split statements if needed (simple semicolon split works here)
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(Boolean);

(async () => {
  try {
    for (const stmt of statements) {
      await new Promise((resolve, reject) => {
        db.query(stmt, (err) => {
          if (err) {
            // ignore "already exists" type errors
            if (err.code === 'ER_DB_CREATE_EXISTS' || err.code === 'ER_TABLE_EXISTS_ERROR') {
              return resolve();
            }
            return reject(err);
          }
          resolve();
        });
      });
    }
    console.log('Database schema applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exit(1);
  }
})();
