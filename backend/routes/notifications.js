const express = require("express");
const router = express.Router();
const db = require("../config/mysql");
const { auth } = require("../middleware/auth");
const {
  getNotificationPreferences,
  updateNotificationPreferences
} = require("../controllers/notificationsController");

// Get user's notification preferences (authenticated)
router.get("/preferences", auth, (req, res) => {
  getNotificationPreferences(req, res);
});

// Update user's notification preferences (authenticated)
router.put("/preferences", auth, (req, res) => {
  updateNotificationPreferences(req, res);
});

// Unsubscribe from all emails (public, uses token)
router.get("/unsubscribe/:token", (req, res) => {
  const token = req.params.token;

  db.query(
    "UPDATE user_notification_preferences SET unsubscribed_from_all = TRUE WHERE unsubscribe_token = ?",
    [token],
    (err) => {
      if (err) {
        return res.status(500).send("Error unsubscribing");
      }
      res.send(
        '<p>You have been unsubscribed from all emails. You can still manage your preferences in your account settings.</p>'
      );
    }
  );
});

// Get notification history (for admin debugging)
router.get("/history", auth, (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: "Admin only" });
  }

  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;

  db.query(
    "SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
