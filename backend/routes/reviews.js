const express = require("express");
const router = express.Router();
const reviewsController = require("../controllers/reviewsController");

router.get("/", reviewsController.getReviews);
router.post("/", reviewsController.createReview);
router.get("/company/:companyId", reviewsController.getCompanyReviews);
router.post("/company/:companyId", reviewsController.createCompanyReview);

module.exports = router;
