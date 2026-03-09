const express = require("express");
const router = express.Router();
const savedJobsController = require("../controllers/savedJobsController");
const { auth } = require("../middleware/auth");

router.get("/", auth, savedJobsController.listSavedJobs);
router.get("/status/:jobId", auth, savedJobsController.getSavedStatus);
router.post("/:jobId", auth, savedJobsController.saveJob);
router.delete("/:jobId", auth, savedJobsController.removeJob);

module.exports = router;
