// Simple AI Chat Frontend
// Connects to /api/chat and displays responses

document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("aiChatForm");
  const chatInput = document.getElementById("aiChatInput");
  const chatBox = document.getElementById("aiChatBox");

  if (!chatForm || !chatInput || !chatBox) return;

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Show user message
    chatBox.innerHTML += `<div class="chat-msg user-msg"><b>You:</b> ${message}</div>`;
    chatInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Call backend
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      chatBox.innerHTML += `<div class="chat-msg ai-msg"><b>AI:</b> ${data.reply || "(No response)"}</div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
      chatBox.innerHTML += `<div class="chat-msg error-msg">Error: ${err.message}</div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
});
