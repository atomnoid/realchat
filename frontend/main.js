const ws = new WebSocket("ws://localhost:3000");

const msgBox = document.getElementById("messages");
const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const themeBtn = document.getElementById("themeToggle");

// Receive messages
ws.onmessage = (event) => {
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = event.data;
  msgBox.appendChild(div);
  msgBox.scrollTop = msgBox.scrollHeight;
};

// Send message
sendBtn.onclick = () => {
  if (input.value.trim() !== "") {
    ws.send(input.value);
    input.value = "";
  }
};

// Enter to send
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Theme Toggle
themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
  themeBtn.textContent =
    document.body.classList.contains("dark") ? "🌙" : "☀️";
};
