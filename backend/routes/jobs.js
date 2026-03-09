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
    const isPdf = file.mimetype === "application/pdf";
    cb(isPdf ? null : new Error("Only PDF files are allowed"), isPdf);
  }
});

/* GET all jobs */
router.get("/", optionalAuth, jobsController.getJobs);

/* ADD job */
router.post("/", auth, employerOnly, jobsController.addJob);

/* APPLY job */
router.post("/:id/apply", auth, upload.single("cv"), applicationsController.applyJob);



module.exports = router;
