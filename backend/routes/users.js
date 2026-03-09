const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyUser,
  getMe,
  updateMe,
  getJobSeekerProfile,
  updateJobSeekerProfile,
  getEmployerProfile,
  updateEmployerProfile,
  verifyEmail,
  forgotPassword,
  resetPassword
} = require("../controllers/usersController");
const { auth } = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.put("/verify/:userId", verifyUser);
router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.get("/job-seeker-profile", auth, getJobSeekerProfile);
router.put("/job-seeker-profile", auth, updateJobSeekerProfile);
router.get("/employer-profile", auth, getEmployerProfile);
router.put("/employer-profile", auth, updateEmployerProfile);

module.exports = router;
