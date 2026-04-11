const TYPE_CHECKS = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && Number.isFinite(v),
  boolean: (v) => typeof v === "boolean",
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  array: (v) => Array.isArray(v)
};

const isEmpty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const toNumberIfNeeded = (value, rule) => {
  if (!rule || rule.type !== "number" || rule.coerce !== true) return value;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
};

const validateField = (name, value, rule, errors) => {
  const val = toNumberIfNeeded(value, rule);

  if (rule.required && isEmpty(val)) {
    errors.push({ field: name, message: "is required" });
    return;
  }

  if (isEmpty(val)) return;

  if (rule.type && TYPE_CHECKS[rule.type] && !TYPE_CHECKS[rule.type](val)) {
    errors.push({ field: name, message: `must be a ${rule.type}` });
    return;
  }

  if (rule.type === "string") {
    const s = String(val);
    if (rule.minLength != null && s.length < rule.minLength) {
      errors.push({ field: name, message: `must be at least ${rule.minLength} characters` });
    }
    if (rule.maxLength != null && s.length > rule.maxLength) {
      errors.push({ field: name, message: `must be at most ${rule.maxLength} characters` });
    }
    if (rule.pattern && !rule.pattern.test(s)) {
      errors.push({ field: name, message: "has invalid format" });
    }
  }

  if (rule.type === "number") {
    if (rule.integer && !Number.isInteger(val)) {
      errors.push({ field: name, message: "must be an integer" });
    }
    if (rule.min != null && val < rule.min) {
      errors.push({ field: name, message: `must be >= ${rule.min}` });
    }
    if (rule.max != null && val > rule.max) {
      errors.push({ field: name, message: `must be <= ${rule.max}` });
    }
  }

  if (rule.enum && Array.isArray(rule.enum) && !rule.enum.includes(val)) {
    errors.push({ field: name, message: `must be one of: ${rule.enum.join(", ")}` });
  }
};

const validateGroup = (sourceName, source, schema, errors) => {
  if (!schema) return;
  Object.keys(schema).forEach((name) => {
    validateField(`${sourceName}.${name}`, source ? source[name] : undefined, schema[name], errors);
  });
};

module.exports = (schema = {}) => (req, res, next) => {
  const errors = [];
  validateGroup("body", req.body || {}, schema.body, errors);
  validateGroup("params", req.params || {}, schema.params, errors);
  validateGroup("query", req.query || {}, schema.query, errors);

  if (errors.length) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      errors
    });
  }

  return next();
};
