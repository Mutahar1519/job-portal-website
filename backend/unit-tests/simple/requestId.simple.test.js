const assert = require("assert");
const requestId = require("../../middleware/requestId");

function mockReq(headers = {}) {
  return { headers };
}

function mockRes() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    }
  };
}

function runRequestIdMiddlewareTests() {
  // should generate request id
  {
    const req = mockReq();
    const res = mockRes();
    let called = false;

    requestId(req, res, () => {
      called = true;
    });

    assert.strictEqual(called, true, "next() should be called");
    assert.ok(req.requestId, "requestId should be generated");
    assert.strictEqual(res.headers["X-Request-Id"], req.requestId, "response header should match request id");
  }

  // should preserve inbound request id
  {
    const req = mockReq({ "x-request-id": "demo-id-123" });
    const res = mockRes();
    requestId(req, res, () => {});

    assert.strictEqual(req.requestId, "demo-id-123", "incoming request id should be reused");
    assert.strictEqual(res.headers["X-Request-Id"], "demo-id-123", "response should expose incoming request id");
  }

  console.log("PASS: RequestId middleware tests");
}

if (require.main === module) {
  try {
    runRequestIdMiddlewareTests();
  } catch (error) {
    console.error("FAIL: RequestId middleware tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runRequestIdMiddlewareTests };
