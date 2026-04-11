// Intentionally left blank to prevent Playwright from running Jest tests. All Jest tests have been moved to backend/unit-tests.
    const res = await request(app).get('/company');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

  test('createCompany - success', async () => {
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, [])) // check existing
      .mockImplementationOnce((sql, params, cb) => cb(null, { insertId: 2 })); // insert
    const res = await request(app).post('/company').send({ name: 'Beta LLC' });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/created/i);
    expect(res.body.id).toBe(2);
  });

  test('createCompany - already exists', async () => {
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, [{ id: 1 }])); // check existing
    const res = await request(app).post('/company').send({ name: 'Acme Inc.' });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('createCompany - validation error', async () => {
    const res = await request(app).post('/company').send({ name: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('createCompany - db error', async () => {
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, [])) // check existing
      .mockImplementationOnce((sql, params, cb) => cb(new Error('DB error'))); // insert
    const res = await request(app).post('/company').send({ name: 'Gamma Ltd.' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });
});
