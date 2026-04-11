const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models";
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || "microsoft/DialoGPT-medium";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

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

const callHuggingFace = async (message) => {
  const apiKey = HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  // For DialoGPT, we format as conversation
  const conversation = `System: You are the JobPortal AI assistant. Provide concise help about jobs, applications, payments, and account/profile guidance. Do not claim access to personal data or payment systems. If asked for user info, explain that users should open their Profile while signed in. For payment issues, give short troubleshooting steps and suggest contacting support@jobportal.com if unresolved. Keep replies under 3 sentences.\nUser: ${message}\nAssistant:`;

  const payload = {
    inputs: conversation,
    parameters: {
      max_length: 200,
      temperature: 0.7,
      do_sample: true,
      return_full_text: false,
      pad_token_id: 50256  // EOS token for GPT models
    }
  };

  const response = await fetch(`${HUGGINGFACE_API_URL}/${HUGGINGFACE_MODEL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Hugging Face error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Handle different response formats
  let content = null;
  if (Array.isArray(data) && data.length > 0) {
    content = data[0].generated_text;
  } else if (data.generated_text) {
    content = data.generated_text;
  }

  // Clean up the response - remove the input part if present
  if (content && content.includes("Assistant:")) {
    content = content.split("Assistant:")[1].trim();
  }

  return content ? content.trim() : null;
};

exports.chatBot = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ reply: "Please ask a question." });
  }

  try {
    const aiReply = await callHuggingFace(message);
    if (aiReply) {
      return res.json({ reply: aiReply });
    }
  } catch (err) {
    console.error("AI chat error:", err.message);
  }

  const reply = buildFallbackReply(message);
  return res.json({ reply });
};
