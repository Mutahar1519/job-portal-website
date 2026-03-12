const express = require("express");
const router = express.Router();
const jobAlertsController = require("../controllers/jobAlertsController");
const { auth } = require("../middleware/auth");

router.get("/", auth, jobAlertsController.listAlerts);
router.post("/", auth, jobAlertsController.createAlert);
router.put("/:id", auth, jobAlertsController.updateAlert);
router.delete("/:id", auth, jobAlertsController.deleteAlert);

router.get("/shift-notifications", auth, jobAlertsController.listShiftNotifications);
router.put("/shift-notifications/:id/read", auth, jobAlertsController.markShiftNotificationRead);

router.get("/job-notifications", auth, jobAlertsController.listJobNotifications);

module.exports = router;
