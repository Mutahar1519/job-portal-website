const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/mysql");

// Bootstrap: add photo_url to users table if missing
db.query(
  "ALTER TABLE users ADD COLUMN photo_url VARCHAR(255) NULL",
  (err) => {
    if (err && err.code !== "ER_DUP_FIELDNAME") {
      console.warn("users.photo_url bootstrap:", err.message);
    }
  }
);

const {
  registerUser,
  loginUser,
  verifyUser,
  getMe,
  updateMe,
  deleteMe,
  getJobSeekerProfile,
  updateJobSeekerProfile,
  getEmployerProfile,
  updateEmployerProfile,
  verifyEmail,
  forgotPassword,
  resetPassword
} = require("../controllers/usersController");
const { auth } = require("../middleware/auth");

// Photo upload storage
const photoDir = path.join(__dirname, "..", "uploads", "photos");
if (!fs.existsSync(photoDir)) {
  fs.mkdirSync(photoDir, { recursive: true });
}

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype);
    cb(allowed ? null : new Error("Only JPEG, PNG, GIF or WEBP images allowed"), allowed);
  }
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.put("/verify/:userId", verifyUser);
router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.delete("/me", auth, deleteMe);
router.get("/job-seeker-profile", auth, getJobSeekerProfile);
router.put("/job-seeker-profile", auth, updateJobSeekerProfile);
router.get("/employer-profile", auth, getEmployerProfile);
router.put("/employer-profile", auth, updateEmployerProfile);

// Profile photo upload
router.post("/photo", auth, uploadPhoto.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file provided" });
  const photoUrl = `/uploads/photos/${req.file.filename}`;
  res.json({ photo_url: photoUrl });
});

module.exports = router;
