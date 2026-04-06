// Unit tests for shiftsController
// Place in backend/tests/shiftsController.unit.test.js
// Run with: npx jest backend/tests/shiftsController.unit.test.js

const request = require('supertest');
const express = require('express');
const shiftsController = require('../controllers/shiftsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1 }; next(); });

app.post('/shift/accept/:applicationId', (req, res) => shiftsController.acceptShiftApplication(req, res));

// Jest tests removed as they have been moved to unit-tests directory
