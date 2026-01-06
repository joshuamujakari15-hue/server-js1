export function createChat() {
  const launcher = document.createElement("button");
  launcher.className = "chat-launcher";
  launcher.textContent = "Chat with us";

  const panel = document.createElement("div");
  panel.className = "chat-panel glass";
  panel.innerHTML = `
    <div class="chat-header">
      <strong>JoshWebs Assistant</strong>
      <button class="close-chat">✕</button>
    </div>
    <div class="chat-body"></div>
    <div class="chat-input-bar">
      <input class="chat-input" placeholder="Ask about services, pricing..." />
      <button class="chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const body = panel.querySelector(".chat-body");
  const input = panel.querySelector(".chat-input");
  const send = panel.querySelector(".chat-send");
  const close = panel.querySelector(".close-chat");

  function addMessage(role, text) {
    const msg = document.createElement("div");
    msg.className = "msg " + role;
    msg.innerHTML = `<div class="bubble">${text}</div>`;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  async function handleUserMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";

    // Show temporary "Thinking..."
    addMessage("ai", "Thinking...");

    try {
      const res = await fetch("https://server-js1-knwk3trwd-joshua-mujakaris-projects.vercel.app/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

      const data = await res.json();
      body.lastChild.querySelector(".bubble").textContent = data.reply;
    } catch (e) {
      body.lastChild.querySelector(".bubble").textContent =
        "Service unavailable. Please contact us directly.";
    }
  }

  launcher.addEventListener("click", () => panel.classList.toggle("open"));
  close.addEventListener("click", () => panel.classList.remove("open"));
  send.addEventListener("click", handleUserMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUserMessage();
  });
}

document.addEventListener("DOMContentLoaded", () => createChat());
