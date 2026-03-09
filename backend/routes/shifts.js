const express = require("express");
const router = express.Router();
const shiftsController = require("../controllers/shiftsController");
const { auth } = require("../middleware/auth");

router.post("/applications/:applicationId/accept", auth, shiftsController.acceptShiftApplication);
router.post("/:jobId/client-confirm", auth, shiftsController.clientConfirmShift);
router.post("/:jobId/worker-confirm", auth, shiftsController.workerConfirmShift);
router.get("/:jobId/status", auth, shiftsController.getShiftStatus);

module.exports = router;
