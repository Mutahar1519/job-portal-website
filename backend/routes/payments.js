const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { auth } = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const db = require("../config/mysql");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PREMIUM_PRICE_CENTS = Number(process.env.PREMIUM_PRICE_CENTS || 1000);
const PREMIUM_CURRENCY = process.env.PREMIUM_CURRENCY || "usd";
const USE_MOCK_PAYMENTS = process.env.USE_MOCK_PAYMENTS === "true" || !STRIPE_SECRET_KEY;
const MAX_DONATION_CENTS = 5000;
const { notifyShiftAlerts } = require("../utils/shiftAlerts");
const ALLOWED_PAYMENT_METHODS = ["card", "applepay", "gpay", "paypal", "bank_transfer"];

const normalizePaymentMethod = (value) => {
  const method = String(value || "card").trim().toLowerCase();
  return ALLOWED_PAYMENT_METHODS.includes(method) ? method : null;
};

const mapToStripePaymentMethods = (paymentMethod) => {
  const methodMap = {
    "card": ["card"],
    "applepay": ["apple_pay"],
    "gpay": ["google_pay"],
    "paypal": ["paypal"],
    "bank_transfer": ["sepa_debit", "us_bank_account"]
  };
  return methodMap[paymentMethod] || ["card"];
};

if (!STRIPE_SECRET_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY is not set. Using mock payments.");
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

router.post("/create-checkout-session", auth, async (req, res) => {

  const { mode, jobId, donation_cents, payment_method } = req.body;
  const paymentMethod = normalizePaymentMethod(payment_method);

  if (!mode || !["create", "upgrade"].includes(mode)) {
    return res.status(400).json({ message: "Invalid payment mode" });
  }

  if (mode === "upgrade" && !jobId) {
    return res.status(400).json({ message: "jobId is required" });
  }

  if (!paymentMethod) {
    return res.status(400).json({ message: "Invalid payment method. Allowed: " + ALLOWED_PAYMENT_METHODS.join(", ") });
  }

  const donationCents = Number(donation_cents || 0);
  if (!Number.isFinite(donationCents) || donationCents < 0 || donationCents > MAX_DONATION_CENTS) {
    return res.status(400).json({ message: "Invalid donation amount" });
  }

  try {
    const successUrl = mode === "upgrade"
      ? `${FRONTEND_URL}/admin.html?payment=success&mode=upgrade&jobId=${jobId}&session_id={CHECKOUT_SESSION_ID}`
      : `${FRONTEND_URL}/post-jobs.html?payment=success&mode=create&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = mode === "upgrade"
      ? `${FRONTEND_URL}/admin.html?payment=cancel`
      : `${FRONTEND_URL}/post-jobs.html?payment=cancel`;

    if (USE_MOCK_PAYMENTS) {
      const mockSessionId = `mock_${Date.now()}`;
      const mockUrl = successUrl.replace("{CHECKOUT_SESSION_ID}", mockSessionId);
      return res.json({ url: mockUrl, mock: true, payment_method: paymentMethod });
    }

    const lineItems = [
      {
        quantity: 1,
        price_data: {
          currency: PREMIUM_CURRENCY,
          unit_amount: PREMIUM_PRICE_CENTS,
          product_data: {
            name: "Premium Job Posting",
            description: "Boost your job visibility"
          }
        }
      }
    ];

    if (donationCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: PREMIUM_CURRENCY,
          unit_amount: donationCents,
          product_data: {
            name: "Support Tip",
            description: "Optional donation"
          }
        }
      });
    }

    const paymentMethodTypes = mapToStripePaymentMethods(paymentMethod);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        mode,
        jobId: jobId ? String(jobId) : "",
        payment_method: paymentMethod
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

router.post("/confirm", auth, async (req, res) => {
  const { sessionId, mode, jobId, jobData } = req.body;

  if (!sessionId || !mode) {
    return res.status(400).json({ message: "Missing sessionId or mode" });
  }

  try {
    if (!USE_MOCK_PAYMENTS) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ message: "Payment not completed" });
      }
    }

    if (mode === "donation") {
      return res.json({ message: "Donation received" });
    }

    if (mode === "upgrade") {
      if (!jobId) return res.status(400).json({ message: "jobId is required" });

      return adminAuth(req, res, () => {
        db.query(
          "UPDATE jobs SET is_premium = 1 WHERE id = ?",
          [jobId],
          (err, result) => {
            if (err) return res.status(500).json({ message: "Failed to upgrade job" });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
            res.json({ message: "Job upgraded to premium" });
          }
        );
      });
    }

    if (mode === "create") {
      if (!jobData) return res.status(400).json({ message: "jobData is required" });

      const { title, location, job_type, category, description } = jobData;
      const userId = req.user.id;

      if (!title || !location || !job_type || !category || !description) {
        return res.status(400).json({ message: "All fields are required" });
      }

      db.query("SELECT verified FROM users WHERE id = ?", [userId], (err, users) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!users.length) return res.status(404).json({ message: "User not found" });
        if (!users[0].verified) return res.status(403).json({ message: "User not verified" });

        db.query(
          `INSERT INTO jobs
             (title, location, job_type, category, description,
              is_premium, is_approved, posted_by, company_id,
              is_shift, shift_start, shift_end, shift_pay_cents,
              shift_fee_cents, shift_total_cents, shift_currency,
              shift_paid, shift_status, application_deadline,
              moderation_status, moderation_score, moderation_reason, auto_approved_at)
           VALUES (?, ?, ?, ?, ?, 1, 1, ?, NULL,
                   0, NULL, NULL, NULL,
                   NULL, NULL, 'usd',
                   0, 'open', NULL,
                   NULL, NULL, NULL, NULL)`,
          [title, location, job_type, category, description, userId],
          (err, result) => {
            if (err) return res.status(500).json({ message: "Failed to create premium job" });
            res.json({ message: "Premium job created", id: result.insertId });
          }
        );
      });

      return;
    }

    return res.status(400).json({ message: "Invalid payment mode" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

router.post("/confirm-shift", auth, (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ message: "jobId is required" });

  db.query(
    "UPDATE jobs SET shift_paid = 1 WHERE id = ?",
    [jobId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to update shift payment" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });

      notifyShiftAlerts(jobId, { status: "paid", paidAt: new Date() });
      res.json({ message: "Shift payment confirmed" });
    }
  );
});

router.post("/create-donation-session", auth, async (req, res) => {
  const { context, amount_cents, payment_method } = req.body;
  const donationCents = Number(amount_cents || 0);
  const paymentMethod = normalizePaymentMethod(payment_method);

  if (!context || !["apply", "post"].includes(context)) {
    return res.status(400).json({ message: "Invalid donation context" });
  }

  if (!Number.isFinite(donationCents) || donationCents <= 0 || donationCents > MAX_DONATION_CENTS) {
    return res.status(400).json({ message: "Invalid donation amount" });
  }

  if (!paymentMethod) {
    return res.status(400).json({ message: "Invalid payment method. Allowed: " + ALLOWED_PAYMENT_METHODS.join(", ") });
  }

  try {
    const successUrl = `${FRONTEND_URL}/${context === "apply" ? "apply.html" : "post-jobs.html"}?donation=success&context=${context}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/${context === "apply" ? "apply.html" : "post-jobs.html"}?donation=cancel&context=${context}`;

    if (USE_MOCK_PAYMENTS) {
      const mockSessionId = `mock_${Date.now()}`;
      const mockUrl = successUrl.replace("{CHECKOUT_SESSION_ID}", mockSessionId);
      return res.json({ url: mockUrl, mock: true, payment_method: paymentMethod });
    }

    const paymentMethodTypes = mapToStripePaymentMethods(paymentMethod);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PREMIUM_CURRENCY,
            unit_amount: donationCents,
            product_data: {
              name: "Support Tip",
              description: "Optional donation"
            }
          }
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        mode: "donation",
        context,
        payment_method: paymentMethod
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create donation session" });
  }
});

module.exports = router;
