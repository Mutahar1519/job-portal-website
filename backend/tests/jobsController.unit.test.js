// Unit tests for jobsController (example)
// Place in backend/tests/jobsController.unit.test.js
// Run with: npx jest backend/tests/jobsController.unit.test.js

const request = require('supertest');
const express = require('express');
const jobsController = require('../controllers/jobsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());

// Example endpoint: getJobById
app.get('/jobs/:id', (req, res) => jobsController.getJobById(req, res));

describe('JobsController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('getJobById - returns job', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1, title: 'Test Job' }]));
    const res = await request(app).get('/jobs/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: 1, title: 'Test Job' });
  });

  test('getJobById - not found', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, []));
    const res = await request(app).get('/jobs/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('getJobById - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/jobs/1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });
});
// Unit tests for jobsController (example)
// Place in backend/tests/jobsController.unit.test.js
// Run with: npx jest backend/tests/jobsController.unit.test.js

const request = require('supertest');
const express = require('express');
const jobsController = require('../controllers/jobsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());

// Example endpoint: getJobById
app.get('/jobs/:id', (req, res) => jobsController.getJobById(req, res));

describe('JobsController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('getJobById - returns job', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1, title: 'Test Job' }]));
    const res = await request(app).get('/jobs/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: 1, title: 'Test Job' });
  });

  test('getJobById - not found', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, []));
    const res = await request(app).get('/jobs/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('getJobById - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/jobs/1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });
});
