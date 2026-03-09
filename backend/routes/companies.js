const express = require("express");
const router = express.Router();
const companiesController = require("../controllers/companiesController");
const { auth } = require("../middleware/auth");

router.get("/me", auth, companiesController.getMyCompany);
router.post("/", auth, companiesController.createCompany);
router.put("/me", auth, companiesController.updateMyCompany);
router.get("/:id", companiesController.getCompanyPublic);

module.exports = router;
