const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const recommendationsController = require("../controllers/recommendationsController");

/* GET /api/recommendations */
router.get("/", auth, recommendationsController.getRecommendations);

/* GET /api/recommendations/count */
router.get("/count", auth, recommendationsController.getRecommendationCount);

module.exports = router;
