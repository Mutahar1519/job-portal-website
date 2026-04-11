const assert = require("assert");
const controller = require("../controllers/reviewsController");

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

function runReviewsControllerUnitTests() {
  assert(controller && typeof controller === "object", "reviewsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "reviewsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "reviewsController export '" + name + "' should be a function"
    );
  });

  // Behavior test: public review requires all fields.
  {
    const req = { body: { name: "", role: "", rating: 0, message: "" } };
    const res = createMockRes();
    controller.createReview(req, res);
    assert.strictEqual(res.statusCode, 400, "createReview should reject missing required fields");
  }

  // Behavior test: company review requires auth.
  {
    const req = {
      params: { companyId: "1" },
      body: { role: "Candidate", rating: 5, message: "Great experience" }
    };
    const res = createMockRes();
    controller.createCompanyReview(req, res);
    assert.strictEqual(res.statusCode, 401, "createCompanyReview should reject unauthenticated requests");
  }

  // Behavior test: company list rejects invalid company id.
  {
    const req = { params: { companyId: "0" }, query: {} };
    const res = createMockRes();
    controller.getCompanyReviews(req, res);
    assert.strictEqual(res.statusCode, 400, "getCompanyReviews should reject invalid company id");
  }

  console.log("PASS: reviewsController unit tests");
}

if (require.main === module) {
  try {
    runReviewsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: reviewsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runReviewsControllerUnitTests };
