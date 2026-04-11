// Unit tests for notificationsController
// Place in backend/tests/notificationsController.unit.test.js
// Run with: npx jest backend/tests/notificationsController.unit.test.js

const request = require('supertest');
const express = require('express');
const notificationsController = require('../controllers/notificationsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1 }; next(); });

app.get('/notifications/preferences', (req, res) => notificationsController.getNotificationPreferences(req, res));
app.put('/notifications/preferences', (req, res) => notificationsController.updateNotificationPreferences(req, res));


describe('NotificationsController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('getNotificationPreferences - returns preferences', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ user_id: 1, job_alert_emails: true }]));
    const res = await request(app).get('/notifications/preferences');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ user_id: 1, job_alert_emails: true });
  });

  test('getNotificationPreferences - default preferences', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, []));
    const res = await request(app).get('/notifications/preferences');
    expect(res.statusCode).toBe(200);
    expect(res.body.user_id).toBe(1);
    expect(res.body.job_alert_emails).toBe(true);
  });

  test('getNotificationPreferences - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/notifications/preferences');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

  test('updateNotificationPreferences - success', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null));
    const res = await request(app).put('/notifications/preferences').send({ job_alert_emails: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test('updateNotificationPreferences - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).put('/notifications/preferences').send({ job_alert_emails: false });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });
});
