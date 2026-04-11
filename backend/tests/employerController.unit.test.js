// Unit tests for application tags and shortlist endpoints in employerController.js
// Run with: npx jest backend/tests/employerController.unit.test.js

const request = require('supertest');
const express = require('express');
const employerController = require('../controllers/employerController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());

// Mock auth/employerOnly middleware
const fakeAuth = (req, res, next) => { req.user = { id: 1 }; next(); };
app.post('/employer/applications/:id/tags', fakeAuth, employerController.addApplicationTag);
app.delete('/employer/applications/:id/tags', fakeAuth, employerController.removeApplicationTag);
app.get('/employer/applications/:id/tags', fakeAuth, employerController.getApplicationTags);
app.put('/employer/applications/:id/shortlist', fakeAuth, employerController.setApplicationShortlist);
app.get('/employer/applications/:id/shortlist', fakeAuth, employerController.getApplicationShortlist);

describe('EmployerController Application Tags & Shortlist', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('addApplicationTag - success', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{}])) // auth
      .mockImplementationOnce((sql, params, cb) => cb(null)); // insert
    const res = await request(app)
      .post('/employer/applications/123/tags')
      .send({ tag: 'urgent' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Tag added');
  });

  test('removeApplicationTag - success', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{}])) // auth
      .mockImplementationOnce((sql, params, cb) => cb(null)); // delete
    const res = await request(app)
      .delete('/employer/applications/123/tags')
      .send({ tag: 'urgent' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Tag removed');
  });

  test('getApplicationTags - returns tags', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [ { tag: 'urgent' }, { tag: 'remote' } ]));
    const res = await request(app)
      .get('/employer/applications/123/tags');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(['urgent', 'remote']);
  });

  test('setApplicationShortlist - success', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{}])) // auth
      .mockImplementationOnce((sql, params, cb) => cb(null)); // update
    const res = await request(app)
      .put('/employer/applications/123/shortlist')
      .send({ shortlisted: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Shortlist updated');
  });

  test('getApplicationShortlist - returns shortlist status', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [ { shortlisted: 1 } ]));
    const res = await request(app)
      .get('/employer/applications/123/shortlist');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ shortlisted: true });
  });
// });
