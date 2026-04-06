// Unit tests for reviewsController
// Place in backend/tests/reviewsController.unit.test.js
// Run with: npx jest backend/tests/reviewsController.unit.test.js

const request = require('supertest');
const express = require('express');
const reviewsController = require('../controllers/reviewsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());

app.get('/reviews', (req, res) => reviewsController.getReviews(req, res));


describe('ReviewsController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('getReviews - returns reviews', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(null, [{ name: 'Alice', rating: 5 }]));
    const res = await request(app).get('/reviews');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ name: 'Alice', rating: 5 }]);
  });

  test('getReviews - db error', async () => {
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).get('/reviews');
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toMatch(/failed to load reviews/i);
  });
});
