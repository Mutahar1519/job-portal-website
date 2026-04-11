const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

function validateJwtToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

function hasRoleAccess(user, allowedRoles) {
  if (!user) return false;
  if (user.is_admin) return true;
  return allowedRoles.includes(user.role);
}

function validateJobCreationInput(payload) {
  const title = String(payload.title || "").trim();
  const location = String(payload.location || "").trim();
  const jobType = String(payload.job_type || payload.jobType || "").trim();
  const category = String(payload.category || "").trim();
  const description = String(payload.description || "").trim();

  const isShift = payload.is_shift === true || payload.is_shift === 1 || payload.is_shift === "1";
  const shiftPayCents = Number(payload.shift_pay_cents);
  const shiftStart = payload.shift_start ? new Date(payload.shift_start) : null;
  const shiftEnd = payload.shift_end ? new Date(payload.shift_end) : null;
  const applicationDeadline = payload.application_deadline ? new Date(payload.application_deadline) : null;

  if (!title || !location || !jobType || !category || !description) {
    return { valid: false, message: "All fields are required" };
  }

  if (title.length > 200 || location.length > 200 || jobType.length > 100 || category.length > 100) {
    return { valid: false, message: "One or more fields are too long" };
  }

  if (description.length < 20 || description.length > 5000) {
    return { valid: false, message: "Description must be 20-5000 characters" };
  }

  if (applicationDeadline && Number.isNaN(applicationDeadline.valueOf())) {
    return { valid: false, message: "Invalid application deadline" };
  }

  if (applicationDeadline && applicationDeadline <= new Date()) {
    return { valid: false, message: "Application deadline must be in the future" };
  }

  if (isShift) {
    if (!shiftStart || Number.isNaN(shiftStart.valueOf())) {
      return { valid: false, message: "Shift start time is required" };
    }
    if (!shiftEnd || Number.isNaN(shiftEnd.valueOf())) {
      return { valid: false, message: "Shift end time is required" };
    }
    if (!shiftPayCents || shiftPayCents <= 0) {
      return { valid: false, message: "Shift pay is required" };
    }
  }

  return { valid: true };
}

function test(title, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      return result
        .then(() => console.log(`PASS: ${title}`))
        .catch((error) => {
          console.error(`FAIL: ${title}`);
          console.error(error);
          process.exitCode = 1;
        });
    }
    console.log(`PASS: ${title}`);
    return Promise.resolve();
  } catch (error) {
    console.error(`FAIL: ${title}`);
    console.error(error);
    process.exitCode = 1;
    return Promise.resolve();
  }
}

async function run() {
  await test("Email validation accepts valid emails", () => {
    console.assert(isEmail("student@example.com") === true, "Expected valid email to pass");
    console.assert(isEmail("abc.def@uni.edu") === true, "Expected valid email to pass");
  });

  await test("Email validation rejects invalid emails", () => {
    console.assert(isEmail("bad-email") === false, "Expected invalid email to fail");
    console.assert(isEmail("noatsign.com") === false, "Expected invalid email to fail");
    console.assert(isEmail("") === false, "Expected empty email to fail");
  });

  await test("Password hashing and comparison works", async () => {
    const plain = "Password123";
    const hashed = await hashPassword(plain);

    console.assert(hashed !== plain, "Hash should not match plain password");
    console.assert(await comparePassword(plain, hashed), "Correct password should match hash");
    console.assert(!(await comparePassword("wrongPassword", hashed)), "Wrong password should fail");
  });

  await test("JWT token validation works", () => {
    const secret = process.env.JWT_SECRET || "test_jwt_secret";
    const token = jwt.sign({ id: 1, role: "employer", is_admin: false }, secret, { expiresIn: "1h" });

    const validPayload = validateJwtToken(token, secret);
    const invalidPayload = validateJwtToken(`${token}broken`, secret);

    console.assert(validPayload && validPayload.id === 1, "Expected valid token payload");
    console.assert(invalidPayload === null, "Expected invalid token to return null");
  });

  await test("Role-based access control works", () => {
    const admin = { id: 1, role: "job_seeker", is_admin: true };
    const employer = { id: 2, role: "employer", is_admin: false };
    const seeker = { id: 3, role: "job_seeker", is_admin: false };

    console.assert(hasRoleAccess(admin, ["employer"]) === true, "Admin should always have access");
    console.assert(hasRoleAccess(employer, ["employer"]) === true, "Employer should have employer access");
    console.assert(hasRoleAccess(seeker, ["employer"]) === false, "Job seeker should not have employer access");
  });

  await test("Job creation validation accepts good payload", () => {
    const validJob = {
      title: "Backend Developer",
      location: "London",
      job_type: "full-time",
      category: "Software",
      description: "We are hiring a backend developer with Node.js experience and API skills.",
      application_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const result = validateJobCreationInput(validJob);
    console.assert(result.valid === true, "Expected valid job payload");
  });

  await test("Job creation validation rejects bad payload", () => {
    const invalidJob = {
      title: "",
      location: "",
      job_type: "",
      category: "",
      description: "short"
    };

    const result = validateJobCreationInput(invalidJob);
    console.assert(result.valid === false, "Expected invalid job payload");
    console.assert(result.message === "All fields are required", "Expected missing fields message");
  });

  await test("Job shift validation rejects missing shift fields", () => {
    const invalidShiftJob = {
      title: "Night Shift Worker",
      location: "Manchester",
      job_type: "shift",
      category: "Logistics",
      description: "This role requires overnight shift support for warehouse operations.",
      is_shift: true,
      shift_pay_cents: 0
    };

    const result = validateJobCreationInput(invalidShiftJob);
    console.assert(result.valid === false, "Expected invalid shift job payload");
  });
}

run().then(() => {
  if (!process.exitCode) {
    console.log("\nAll simple unit tests completed.");
  }
});

module.exports = {
  isEmail,
  hashPassword,
  comparePassword,
  validateJwtToken,
  hasRoleAccess,
  validateJobCreationInput
};
