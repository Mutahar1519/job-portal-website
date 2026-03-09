document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("supportWidget")) return;

  const widget = document.createElement("div");
  widget.id = "supportWidget";
  widget.innerHTML = `
    <button id="supportToggle" class="support-toggle" type="button" aria-label="Open support chat">💬</button>
    <div id="supportPanel" class="support-panel hidden">
      <div class="support-header">
        <div>
          <strong>AI Support (beta)</strong>
          <div class="p-muted">Ask about jobs, applications, payments, or profile.</div>
        </div>
        <button id="supportClose" class="btn btn-outline" type="button">Close</button>
      </div>
      <div class="support-quick">
        <button class="btn btn-outline" data-quick="How do I apply?">Apply</button>
        <button class="btn btn-outline" data-quick="How do I post a job?">Post job</button>
        <button class="btn btn-outline" data-quick="What is premium?">Premium</button>
        <button class="btn btn-outline" data-quick="My payment is stuck">Payment help</button>
        <button class="btn btn-outline" data-quick="How do I update my profile?">Profile</button>
      </div>
      <div id="supportMessages" class="support-messages"></div>
      <form id="supportForm" class="support-form">
        <input id="supportInput" class="form-input" type="text" placeholder="Type your question" />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
      <div class="support-footer p-muted">Human support: support@jobportal.com</div>
    </div>
  `;

  document.body.appendChild(widget);

  const toggle = document.getElementById("supportToggle");
  const panel = document.getElementById("supportPanel");
  const closeBtn = document.getElementById("supportClose");
  const form = document.getElementById("supportForm");
  const input = document.getElementById("supportInput");
  const messages = document.getElementById("supportMessages");

  const appendMessage = (text, isUser) => {
    const bubble = document.createElement("div");
    bubble.className = isUser ? "support-bubble user" : "support-bubble";
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  };

  const sendMessage = async (text) => {
    if (!text) return;
    appendMessage(text, true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      appendMessage(data.reply || "Support is unavailable right now.", false);
    } catch (err) {
      console.error(err);
      appendMessage("Support is unavailable right now.", false);
    }
  };

  toggle?.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });

  closeBtn?.addEventListener("click", () => {
    panel.classList.add("hidden");
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = (input.value || "").trim();
    input.value = "";
    sendMessage(value);
  });

  document.querySelectorAll("[data-quick]").forEach((button) => {
    button.addEventListener("click", () => {
      sendMessage(button.getAttribute("data-quick"));
    });
  });

  appendMessage("Hi! I am the JobPortal AI assistant. Ask me about jobs, applications, payments, or your profile.", false);
});
