const express = require("express");
const router = express.Router();
const employerController = require("../controllers/employerController");
const { auth } = require("../middleware/auth");
const employerOnly = require("../middleware/employerOnly");

router.get("/jobs", auth, employerOnly, employerController.getMyJobs);
router.get("/applications", auth, employerOnly, employerController.getJobApplications);
router.put("/applications/:id/pipeline", auth, employerOnly, employerController.updatePipelineStage);
router.get("/stats", auth, employerOnly, employerController.getEmployerStats);

module.exports = router;
