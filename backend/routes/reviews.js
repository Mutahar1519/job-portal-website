const express = require("express");
const router = express.Router();
const reviewsController = require("../controllers/reviewsController");

router.get("/", reviewsController.getReviews);
router.post("/", reviewsController.createReview);

// Company reviews
const { auth } = require("../middleware/auth");
router.get("/company/:companyId", reviewsController.getCompanyReviews);
router.post("/company/:companyId", auth, reviewsController.createCompanyReview);

module.exports = router;
