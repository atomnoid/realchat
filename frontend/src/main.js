// ----------------- Connect to backend -----------------
const socket = io("http://localhost:3000");

// ----------------- Utils -----------------
const $ = (sel) => document.querySelector(sel);
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const escapeHtml = (str) =>
  String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// ----------------- State -----------------
const DEFAULT_ROOM = "general";
let currentRoom = sessionStorage.getItem("rc_room") || DEFAULT_ROOM;
let username = sessionStorage.getItem("rc_username") || "Anonymous";
let rooms = new Set(["general"]);
let typingTimeout = null;

// ----------------- DOM refs -----------------
const roomsList = $("#roomsList");
const messages = $("#messages");
const chatForm = $("#chatForm");
const messageInput = $("#messageInput");
const newRoomInput = $("#newRoomInput");
const createRoomBtn = $("#createRoomBtn");
const roomTitle = $("#roomTitle");
const roomUsers = $("#roomUsers");
const typingIndicator = $("#typingIndicator");
const usernameInput = $("#usernameInput");
const saveNameBtn = $("#saveName");
const themeToggle = $("#themeToggle");

// ----------------- Theme -----------------
function setTheme(isDark) {
  document.getElementById("app").className = isDark ? "theme-dark" : "theme-bright";
  sessionStorage.setItem("rc_theme", isDark ? "dark" : "bright");
}
setTheme(sessionStorage.getItem("rc_theme") !== "bright");
themeToggle.onclick = () => {
  const isDark = document.getElementById("app").classList.contains("theme-dark");
  setTheme(!isDark);
};

// ----------------- Render Rooms -----------------
function renderRooms() {
  roomsList.innerHTML = "";
  [...rooms].sort().forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `# ${r}`;
    li.className = r === currentRoom ? "active" : "";
    li.onclick = () => switchRoom(r);
    roomsList.appendChild(li);
  });
}
renderRooms();

// ----------------- Append message -----------------
function appendMessage({ text, user, time, room }) {
  if (room !== currentRoom) return;

  const msg = document.createElement("div");
  msg.className = "msg " + (user === username ? "me" : "");

  msg.innerHTML = `
    <div class="meta">
      <span class="avatar">${user.slice(0, 2).toUpperCase()}</span>
      <span class="name">${user}</span>
      <span class="time">${fmtTime(time)}</span>
    </div>
    <div class="body">${escapeHtml(text)}</div>
  `;

  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

// ----------------- Connection Events -----------------
socket.on("connect", () => {
  socket.emit("join_room", { room: currentRoom, user: username });
});

socket.on("receive_message", appendMessage);

socket.on("room_users", ({ room, count }) => {
  if (room === currentRoom) {
    roomUsers.textContent = `${count} users`;
  }
});

socket.on("user_typing", ({ room, user }) => {
  if (room !== currentRoom) return;
  typingIndicator.style.display = "block";
  typingIndicator.textContent = `${user} is typing...`;

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.style.display = "none";
  }, 1200);
});

// ----------------- Sending Message -----------------
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  const payload = {
    text,
    user: username,
    time: Date.now(),
    room: currentRoom
  };

  appendMessage(payload);
  socket.emit("send_message", payload);
  messageInput.value = "";
});

// Typing event
messageInput.addEventListener("input", () => {
  socket.emit("typing", { room: currentRoom, user: username });
});

// ----------------- Create Room -----------------
createRoomBtn.onclick = () => {
  const r = newRoomInput.value.trim();
  if (!r) return;
  const normalized = r.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();

  rooms.add(normalized);
  newRoomInput.value = "";
  switchRoom(normalized);
  renderRooms();
};

// ----------------- Switch Room -----------------
function switchRoom(room) {
  currentRoom = room;
  sessionStorage.setItem("rc_room", room);
  roomTitle.textContent = `# ${room}`;
  messages.innerHTML = "";
  socket.emit("join_room", { room, user: username });
  renderRooms();
}

// ----------------- Username Save -----------------
saveNameBtn.onclick = () => {
  const v = usernameInput.value.trim();
  if (!v) return alert("Enter a name");
  username = v;
  sessionStorage.setItem("rc_username", v);
};
