const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const resumesController = require("../controllers/resumesController");
const { auth } = require("../middleware/auth");

const router = express.Router();

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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    cb(isPdf ? null : new Error("Only PDF files are allowed"), isPdf);
  }
});

router.get("/me", auth, resumesController.getMyResume);
router.post("/", auth, upload.single("resume"), resumesController.uploadResume);

module.exports = router;
