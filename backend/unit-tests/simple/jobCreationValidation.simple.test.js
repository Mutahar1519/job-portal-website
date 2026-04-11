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

function runJobValidationTests() {
  const validJob = {
    title: "Backend Developer",
    location: "London",
    job_type: "full-time",
    category: "Software",
    description: "We are hiring a backend developer with Node.js experience and API skills.",
    application_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  const invalidJob = {
    title: "",
    location: "",
    job_type: "",
    category: "",
    description: "short"
  };

  const invalidShiftJob = {
    title: "Night Shift Worker",
    location: "Manchester",
    job_type: "shift",
    category: "Logistics",
    description: "This role requires overnight shift support for warehouse operations.",
    is_shift: true,
    shift_pay_cents: 0
  };

  const ok = validateJobCreationInput(validJob);
  const bad = validateJobCreationInput(invalidJob);
  const badShift = validateJobCreationInput(invalidShiftJob);

  console.assert(ok.valid === true, "Expected valid job payload");
  console.assert(bad.valid === false, "Expected invalid job payload");
  console.assert(bad.message === "All fields are required", "Expected missing fields message");
  console.assert(badShift.valid === false, "Expected invalid shift payload");

  console.log("PASS: Job creation validation tests");
}

module.exports = {
  validateJobCreationInput,
  runJobValidationTests
};
