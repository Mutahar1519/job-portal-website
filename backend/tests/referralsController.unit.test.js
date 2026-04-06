// Unit tests for referralsController
// Place in backend/tests/referralsController.unit.test.js
// Run with: npx jest backend/tests/referralsController.unit.test.js

const request = require('supertest');
const express = require('express');
const referralsController = require('../controllers/referralsController');
const db = require('../config/mysql');

jest.mock('../config/mysql');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1 }; next(); });

app.post('/referrals', (req, res) => referralsController.createReferral(req, res));

// Jest unit tests removed as part of migration to unit-tests directory
