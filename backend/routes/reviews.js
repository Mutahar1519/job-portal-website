const express = require("express");
const router = express.Router();
const reviewsController = require("../controllers/reviewsController");
const { auth } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.get("/", reviewsController.getReviews);
router.post(
	"/",
	validate({
		body: {
			name: { required: true, type: "string", minLength: 2, maxLength: 120 },
			role: { required: true, type: "string", minLength: 2, maxLength: 120 },
			email: { type: "string", minLength: 5, maxLength: 255, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
			rating: { required: true, type: "number", coerce: true, integer: true, min: 1, max: 5 },
			message: { required: true, type: "string", minLength: 3, maxLength: 600 }
		}
	}),
	reviewsController.createReview
);
router.get("/company/:companyId", reviewsController.getCompanyReviews);
router.post(
	"/company/:companyId",
	auth,
	validate({
		params: {
			companyId: { required: true, type: "string", pattern: /^\d+$/ }
		},
		body: {
			role: { required: true, type: "string", minLength: 2, maxLength: 120 },
			rating: { required: true, type: "number", coerce: true, integer: true, min: 1, max: 5 },
			message: { required: true, type: "string", minLength: 3, maxLength: 600 },
			job_id: { type: "number", coerce: true, min: 1 }
		}
	}),
	reviewsController.createCompanyReview
);

module.exports = router;
