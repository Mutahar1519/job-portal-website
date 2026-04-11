const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/mysql");
const resumesController = require("../controllers/resumesController");
const { getPolicy } = require("../utils/uploadPolicy");
const { auth } = require("../middleware/auth");

const router = express.Router();
const resumePolicy = getPolicy("resumes");

// Bootstrap resumes table if missing
// (prevents 500s on upload when schema wasn't fully applied)
db.query(
  `CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    extracted_text LONGTEXT NULL,
    parsed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_resume_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.warn("resumes table bootstrap failed:", err.message);
    }
  }
);

const uploadDir = path.join(__dirname, "..", "uploads", "resumes");
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
  limits: { fileSize: resumePolicy.maxSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(resumePolicy.allowedMimeTypes);
    const ext = path.extname(file.originalname || "").toLowerCase();
    const isAllowedExt = resumePolicy.allowedExtensions.includes(ext);
    const isAllowed = allowed.has(file.mimetype) || isAllowedExt;
    cb(isAllowed ? null : new Error(`Only ${resumePolicy.allowedExtensions.join(", ")} files are allowed`), isAllowed);
  }
});

router.get("/me", auth, resumesController.getMyResume);
router.post("/", auth, upload.single("resume"), resumesController.uploadResume);

router.use((err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Resume must be ${resumePolicy.maxSizeMB}MB or smaller` });
    }
    return res.status(400).json({ message: err.message || "Invalid resume upload" });
  }

  if (err.message && /Only PDF, DOC, or DOCX files are allowed/i.test(err.message)) {
    return res.status(400).json({ message: err.message });
  }

  return next(err);
});

module.exports = router;
