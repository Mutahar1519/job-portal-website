const express = require("express");
const router = express.Router();
const applicationsController = require("../controllers/applicationsController");
const { auth } = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

// User: list own applications
router.get("/my", auth, applicationsController.getMyApplications);
router.get("/interviews/my", auth, applicationsController.getMyInterviews);
router.get("/background-checks/my", auth, applicationsController.getMyBackgroundChecks);
router.get("/interviews/:id/ics", auth, applicationsController.downloadMyInterviewIcs);

// Admin: list all applications
router.get("/admin", adminAuth, applicationsController.getAdminApplications);

// Admin: update application status
router.put("/:id/status", adminAuth, applicationsController.updateApplicationStatus);

module.exports = router;
