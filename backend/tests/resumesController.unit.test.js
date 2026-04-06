// Unit tests for resumesController
// Place in backend/tests/resumesController.unit.test.js
// Run with: npx jest backend/tests/resumesController.unit.test.js


const request = require('supertest');
const express = require('express');
const resumesController = require('../controllers/resumesController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1 }; next(); });

// Mock file upload middleware
app.post('/resume', (req, res) => resumesController.uploadResume(req, res));

describe('ResumesController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('uploadResume - missing file', async () => {
    const res = await request(app).post('/resume');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('uploadResume - db error', async () => {
    const reqFile = { path: 'fakepath', mimetype: 'application/pdf', originalname: 'resume.pdf', filename: 'resume.pdf' };
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB error')));
    const res = await request(app).post('/resume').attach('file', Buffer.from('test'), 'resume.pdf');
    // This test may need adjustment depending on how file upload is handled in the controller
    expect(res.statusCode).toBe(500);
  });
});
