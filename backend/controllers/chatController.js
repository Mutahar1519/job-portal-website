const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

const buildFallbackReply = (message) => {
  const msg = (message || "").toLowerCase();
  let reply = "I can help with jobs, applications, payments, and profile questions. Try asking about apply, post job, payment status, or support.";

  if (msg.includes("apply")) {
    reply = "To apply for a job, open a listing and click Apply. You can upload your CV (PDF).";
  } else if (msg.includes("post job") || msg.includes("post a job")) {
    reply = "Verified employers can post jobs. Open Post Job from the dashboard and submit the form.";
  } else if (msg.includes("premium")) {
    reply = "Premium jobs appear at the top and get more visibility for a limited time.";
  } else if (msg.includes("payment") && (msg.includes("stuck") || msg.includes("failed") || msg.includes("pending"))) {
    reply = "If a payment is stuck, check your dashboard for status, wait a few minutes, then retry. If charged but not updated, contact support@jobportal.com with the email and time.";
  } else if (msg.includes("payment")) {
    reply = "Payments are handled from the checkout screen. You can see status in your dashboard under Billing.";
  } else if (msg.includes("application") && msg.includes("status")) {
    reply = "Open your Dashboard and go to Applications to see the latest status for each job.";
  } else if (msg.includes("profile") || msg.includes("user info") || msg.includes("my info")) {
    reply = "For account details, open your Profile page while signed in. I do not have access to personal data.";
  } else if (msg.includes("contact") || msg.includes("support")) {
    reply = "You can contact support via email: support@jobportal.com";
  } else if (msg.includes("register") || msg.includes("sign up")) {
    reply = "You can register using the signup form on the website.";
  } else if (msg.includes("what are you doing here")) {
    reply = "I am here to help with jobs, applications, payments, and account questions.";
  }

  return reply;
};

const callOpenAI = async (message) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const payload = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are the JobPortal AI assistant. Provide concise help about jobs, applications, payments, and account/profile guidance. Do not claim access to personal data or payment systems. If asked for user info, explain that users should open their Profile while signed in. For payment issues, give short troubleshooting steps and suggest contacting support@jobportal.com if unresolved. Keep replies under 3 sentences."
      },
      { role: "user", content: message }
    ],
    temperature: 0.2,
    max_tokens: 200
  };

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return content ? content.trim() : null;
};

exports.chatBot = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ reply: "Please ask a question." });
  }

  try {
    const aiReply = await callOpenAI(message);
    if (aiReply) {
      return res.json({ reply: aiReply });
    }
  } catch (err) {
    console.error("AI chat error:", err.message);
  }

  const reply = buildFallbackReply(message);
  return res.json({ reply });
};
