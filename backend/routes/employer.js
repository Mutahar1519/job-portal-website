const express = require("express");
const router = express.Router();
const employerController = require("../controllers/employerController");
const { auth } = require("../middleware/auth");
const employerOnly = require("../middleware/employerOnly");

router.get("/jobs", auth, employerOnly, employerController.getMyJobs);
router.post("/jobs/bulk-upload", auth, employerOnly, employerController.bulkUploadJobs);
router.put("/jobs/:id/renew", auth, employerOnly, employerController.renewJob);
router.get("/applications", auth, employerOnly, employerController.getJobApplications);
router.put("/applications/:id/pipeline", auth, employerOnly, employerController.updatePipelineStage);
router.put("/applications/:id/evaluation", auth, employerOnly, employerController.updateApplicationEvaluation);
router.post("/applications/:id/interviews", auth, employerOnly, employerController.scheduleInterview);
router.get("/applications/:id/interviews", auth, employerOnly, employerController.getApplicationInterviews);
router.put("/interviews/:id/status", auth, employerOnly, employerController.updateInterviewStatus);
router.post("/applications/:id/background-check", auth, employerOnly, employerController.createBackgroundCheck);
router.get("/applications/:id/background-checks", auth, employerOnly, employerController.getApplicationBackgroundChecks);
router.put("/background-checks/:id/status", auth, employerOnly, employerController.updateBackgroundCheckStatus);
router.get("/stats", auth, employerOnly, employerController.getEmployerStats);
router.get("/application-notifications", auth, employerOnly, employerController.getApplicationNotifications);
router.put("/application-notifications/read-all", auth, employerOnly, employerController.markAllApplicationNotificationsRead);
router.put("/application-notifications/:id/read", auth, employerOnly, employerController.markApplicationNotificationRead);

// Application tags
router.post("/applications/:id/tags", auth, employerOnly, employerController.addApplicationTag);
router.delete("/applications/:id/tags", auth, employerOnly, employerController.removeApplicationTag);
router.get("/applications/:id/tags", auth, employerOnly, employerController.getApplicationTags);

// Application shortlist
router.put("/applications/:id/shortlist", auth, employerOnly, employerController.setApplicationShortlist);
router.get("/applications/:id/shortlist", auth, employerOnly, employerController.getApplicationShortlist);

module.exports = router;
