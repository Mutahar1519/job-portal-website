// Unit tests for usersController (example)
// Place in backend/tests/usersController.unit.test.js
// Run with: npx jest backend/tests/usersController.unit.test.js

const request = require('supertest');
const express = require('express');
const usersController = require('../controllers/usersController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());

// Example endpoint: getUserById
app.get('/users/:id', (req, res) => usersController.getUserById(req, res));

describe('UsersController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('getUserById - returns user', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1, name: 'Alice', email: 'alice@demo.local' }]));
    const res = await request(app).get('/users/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Alice', email: 'alice@demo.local' });
  });

  test('getUserById - not found', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, []));
    const res = await request(app).get('/users/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('getUserById - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/users/1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });
});
