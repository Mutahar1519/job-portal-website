const express = require("express");
const router = express.Router();
const messagesController = require("../controllers/messagesController");
const { auth } = require("../middleware/auth");

router.get("/applications/:id/messages", auth, messagesController.getMessages);
router.post("/applications/:id/messages", auth, messagesController.postMessage);

module.exports = router;
