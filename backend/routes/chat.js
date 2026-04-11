const express = require("express");
const router = express.Router();
const { auth, adminOnly } = require("../middleware/auth");

const {
	chatBot,
	getChatStatus,
	requestLiveSupport,
	getMySupportTickets,
	getAdminSupportTickets,
	getTicketMessages,
	sendTicketMessage,
	updateTicketStatus,
	assignTicketAdmin,
	getSupportUnreadCounts
} = require("../controllers/chatController");

router.get("/status", getChatStatus);
router.post("/", chatBot);
router.post("/live-support", auth, requestLiveSupport);
router.get("/live-support/my", auth, getMySupportTickets);
router.get("/live-support/unread-count", auth, getSupportUnreadCounts);
router.get("/live-support/admin/tickets", auth, adminOnly, getAdminSupportTickets);
router.put("/live-support/admin/tickets/:ticketId/status", auth, adminOnly, updateTicketStatus);
router.put("/live-support/admin/tickets/:ticketId/assign", auth, adminOnly, assignTicketAdmin);
router.get("/live-support/:ticketId/messages", auth, getTicketMessages);
router.post("/live-support/:ticketId/messages", auth, sendTicketMessage);

module.exports = router;
