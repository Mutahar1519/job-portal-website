// Unit tests for jobAlertsController
// Place in backend/tests/jobAlertsController.unit.test.js
// Run with: npx jest backend/tests/jobAlertsController.unit.test.js

const request = require('supertest');
const express = require('express');
const jobAlertsController = require('../controllers/jobAlertsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1 }; next(); });

app.get('/alerts', (req, res) => jobAlertsController.listAlerts(req, res));
app.post('/alerts', (req, res) => jobAlertsController.createAlert(req, res));


describe('JobAlertsController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('listAlerts - returns alerts', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1, title: 'Daily Alert' }]));
    const res = await request(app).get('/alerts');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, title: 'Daily Alert' }]);
  });

  test('listAlerts - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/alerts');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

});
  
