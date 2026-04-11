const crypto = require("crypto");

module.exports = (req, res, next) => {
  const headerRequestId = String(req.headers["x-request-id"] || "").trim();
  const requestId = headerRequestId || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  return next();
};
