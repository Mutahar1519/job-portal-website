const express = require("express");
const router = express.Router();
const reviewsController = require("../controllers/reviewsController");

router.get("/", reviewsController.getReviews);
router.post("/", reviewsController.createReview);

module.exports = router;
