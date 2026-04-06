const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const applicationsController = require("../controllers/applicationsController");
const jobsController = require("../controllers/jobsController");
const { auth, optionalAuth } = require("../middleware/auth");
const employerOnly = require("../middleware/employerOnly");

const uploadDir = path.join(__dirname, "..", "uploads", "cv");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const jobImageDir = path.join(__dirname, "..", "uploads", "jobs");
if (!fs.existsSync(jobImageDir)) {
  fs.mkdirSync(jobImageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]);
    const ext = path.extname(file.originalname || "").toLowerCase();
    const isAllowedExt = [".pdf", ".doc", ".docx"].includes(ext);
    const isAllowed = allowed.has(file.mimetype) || isAllowedExt;
    cb(isAllowed ? null : new Error("Only PDF, DOC, or DOCX files are allowed"), isAllowed);
<<<<<<< HEAD
=======
  }
});

const jobImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, jobImageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const uploadJobImage = multer({
  storage: jobImageStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImage = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
    cb(isImage ? null : new Error("Only JPEG, PNG, or WebP images are allowed"), isImage);
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  }
});

const jobImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, jobImageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const uploadJobImage = multer({
  storage: jobImageStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImage = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
    cb(isImage ? null : new Error("Only JPEG, PNG, or WebP images are allowed"), isImage);
  }
});

/* Saved searches — must be before /:id */
router.get("/searches", auth, jobsController.getSavedSearches);
router.post("/searches", auth, jobsController.createSavedSearch);
router.delete("/searches/:id", auth, jobsController.deleteSavedSearch);
router.get("/salary-insights", optionalAuth, jobsController.getSalaryInsights);
router.get("/portal-stats", optionalAuth, jobsController.getPortalStats);

/* GET all jobs */
router.get("/", optionalAuth, jobsController.getJobs);
router.get("/:id", optionalAuth, jobsController.getJobById);

/* ADD job */
router.post("/", auth, employerOnly, uploadJobImage.single("job_image"), jobsController.addJob);

/* APPLY job */
router.post("/:id/apply", auth, upload.single("cv"), applicationsController.applyJob);

<<<<<<< HEAD
/* REPORT job */
=======
/* CHECK if user has applied for job */
router.get("/:id/check-application", auth, applicationsController.checkApplicationStatus);

/* REPORT a job listing (auth required to prevent spam, but userId stored for audit) */
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
router.post("/:id/report", auth, jobsController.reportJob);

module.exports = router;
