const express = require("express");
const router = express.Router();
const referralsController = require("../controllers/referralsController");
const { auth } = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

router.post("/create", auth, referralsController.createReferral);
router.get("/my-referrals", auth, referralsController.getMyReferrals);
router.get("/rewards", auth, referralsController.getMyReferralRewards);
router.put("/:id/mark-hired", adminAuth, referralsController.markReferralHired);

module.exports = router;
