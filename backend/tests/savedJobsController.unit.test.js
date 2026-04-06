// Unit tests for savedJobsController
// Place in backend/tests/savedJobsController.unit.test.js
// Run with: npx jest backend/tests/savedJobsController.unit.test.js

const request = require('supertest');
const express = require('express');
const savedJobsController = require('../controllers/savedJobsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1 }; next(); });

app.post('/saved/:jobId', (req, res) => savedJobsController.saveJob(req, res));
app.delete('/saved/:jobId', (req, res) => savedJobsController.removeJob(req, res));
app.get('/saved', (req, res) => savedJobsController.listSavedJobs(req, res));
app.get('/saved/:jobId/status', (req, res) => savedJobsController.getSavedStatus(req, res));

describe('SavedJobsController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('saveJob - success', async () => {
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1 }])) // job exists
      .mockImplementationOnce((sql, params, cb) => cb(null)); // insert
    const res = await request(app).post('/saved/123');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/saved/i);
  });

  test('saveJob - already saved', async () => {
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1 }])) // job exists
      .mockImplementationOnce((sql, params, cb) => cb({ code: 'ER_DUP_ENTRY' })); // duplicate
    const res = await request(app).post('/saved/123');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/already saved/i);
  });

  test('saveJob - job not found', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, []));
    const res = await request(app).post('/saved/123');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('saveJob - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).post('/saved/123');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

  test('removeJob - success', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, { affectedRows: 1 }));
    const res = await request(app).delete('/saved/123');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  test('removeJob - not found', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, { affectedRows: 0 }));
    const res = await request(app).delete('/saved/123');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('removeJob - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).delete('/saved/123');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

  test('listSavedJobs - returns jobs', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1, company_name: 'Acme' }]));
    const res = await request(app).get('/saved');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, company_name: 'Acme' }]);
  });

  test('listSavedJobs - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/saved');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

  test('getSavedStatus - saved', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1 }]));
    const res = await request(app).get('/saved/123/status');
    expect(res.statusCode).toBe(200);
    expect(res.body.saved).toBe(true);
  });

  test('getSavedStatus - not saved', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, []));
    const res = await request(app).get('/saved/123/status');
    expect(res.statusCode).toBe(200);
    expect(res.body.saved).toBe(false);
  });

  test('getSavedStatus - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/saved/123/status');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });
});
