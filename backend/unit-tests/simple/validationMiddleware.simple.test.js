const assert = require("assert");
const validate = require("../../middleware/validate");

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function runValidationMiddlewareTests() {
  const schema = {
    body: {
      mode: { required: true, type: "string", enum: ["create", "upgrade"] },
      rating: { required: true, type: "number", coerce: true, integer: true, min: 1, max: 5 }
    },
    params: {
      companyId: { required: true, type: "string", pattern: /^\d+$/ }
    }
  };

  const middleware = validate(schema);

  // valid request
  {
    const req = { body: { mode: "create", rating: "5" }, params: { companyId: "123" }, query: {} };
    const res = mockRes();
    let called = false;
    middleware(req, res, () => {
      called = true;
    });
    assert.strictEqual(called, true, "next() should be called for valid payload");
    assert.strictEqual(res.statusCode, 200, "status should remain 200 for valid payload");
  }

  // missing field
  {
    const req = { body: { mode: "create" }, params: { companyId: "123" }, query: {} };
    const res = mockRes();
    let called = false;
    middleware(req, res, () => {
      called = true;
    });
    assert.strictEqual(called, false, "next() should not be called for invalid payload");
    assert.strictEqual(res.statusCode, 400, "status should be 400 for invalid payload");
    assert.strictEqual(res.body.code, "VALIDATION_ERROR", "error code should be VALIDATION_ERROR");
  }

  // enum mismatch
  {
    const req = { body: { mode: "delete", rating: 4 }, params: { companyId: "123" }, query: {} };
    const res = mockRes();
    middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, 400, "invalid enum should fail");
  }

  // pattern mismatch
  {
    const req = { body: { mode: "create", rating: 4 }, params: { companyId: "abc" }, query: {} };
    const res = mockRes();
    middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, 400, "invalid params pattern should fail");
  }

  console.log("PASS: Validation middleware tests");
}

if (require.main === module) {
  try {
    runValidationMiddlewareTests();
  } catch (error) {
    console.error("FAIL: Validation middleware tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runValidationMiddlewareTests };
