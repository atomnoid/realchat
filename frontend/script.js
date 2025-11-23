// script.js — frontend logic (vanilla JS) for RealChat
// Make sure this file is loaded AFTER socket.io client script (index.html uses defer)

// ----------------- Config -----------------
const SERVER = "http://localhost:3000"; // backend address
const DEFAULT_ROOM = "general";

// ----------------- Utils -----------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmtTime = (d) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const escapeHtml = (str) =>
  String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// ----------------- App State -----------------
let socket = null;
let username = sessionStorage.getItem("rc_username") || "";
let currentRoom = sessionStorage.getItem("rc_room") || DEFAULT_ROOM;
let rooms = new Set(["general"]);
let userCount = 1;
let typingTimeout = null;

// ----------------- DOM refs -----------------
const roomsList = $("#roomsList");
const messagesEl = $("#messages");
const chatForm = $("#chatForm");
const messageInput = $("#messageInput");
const newRoomInput = $("#newRoomInput");
const createRoomBtn = $("#createRoomBtn");
const roomTitle = $("#roomTitle");
const roomUsers = $("#roomUsers");
const connStatus = $("#connStatus");
const userCountEl = $("#userCount");
const usernameInput = $("#usernameInput");
const saveNameBtn = $("#saveName");
const themeToggle = $("#themeToggle");
const typingIndicator = $("#typingIndicator");

// initialize UI values
usernameInput.value = username;
roomTitle.textContent = `# ${currentRoom}`;
messageInput.placeholder = `Message #${currentRoom} (press Enter to send)`;

// ----------------- Theme toggle -----------------
function setTheme(isDark) {
  const app = document.getElementById("app");
  app.className = isDark ? "theme-dark" : "theme-bright";
  sessionStorage.setItem("rc_theme", isDark ? "dark" : "bright");
}
const savedTheme = sessionStorage.getItem("rc_theme") || "dark";
setTheme(savedTheme === "dark");
themeToggle.addEventListener("click", () => {
  const isDark = document.getElementById("app").classList.contains("theme-dark");
  setTheme(!isDark);
});

// ----------------- Render rooms -----------------
function renderRooms() {
  roomsList.innerHTML = "";
  Array.from(rooms)
    .sort()
    .forEach((r) => {
      const li = document.createElement("li");
      li.textContent = `# ${r}`;
      li.className = r === currentRoom ? "active" : "";
      li.onclick = () => switchRoom(r);
      roomsList.appendChild(li);
    });
}
renderRooms();

// ----------------- Append message to UI -----------------
function appendMessage({ text, user, time, room, id }) {
  // only show messages for current room (client-side filtering)
  if ((room || DEFAULT_ROOM) !== currentRoom) return;

  const showTime = fmtTime(time || Date.now());
  const isMe = user === username || (!user && username === "");

  // message wrapper
  const wrap = document.createElement("div");
  wrap.className = `msg ${isMe ? "me" : ""}`;

  // meta (avatar, name, time)
  const meta = document.createElement("div");
  meta.className = "meta";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = (user || "You").slice(0, 2).toUpperCase();

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = user || "Anonymous";

  const t = document.createElement("span");
  t.className = "time";
  t.textContent = showTime;

  meta.appendChild(avatar);
  meta.appendChild(name);
  meta.appendChild(t);

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = escapeHtml(text);

  wrap.appendChild(meta);
  wrap.appendChild(body);

  messagesEl.appendChild(wrap);
  // auto-scroll
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ----------------- Socket connection -----------------
function connectSocket() {
  socket = io(SERVER, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    connStatus.textContent = "connected";
    // announce presence to server (if server supports it)
    socket.emit("join_room", { room: currentRoom, user: username });
  });

  socket.on("disconnect", () => {
    connStatus.textContent = "disconnected";
  });

  // when server broadcasts a message
  socket.on("receive_message", (data) => {
    appendMessage(data);
  });

  // server-side user list update (optional)
  socket.on("room_users", ({ room, count }) => {
    if (room === currentRoom) {
      roomUsers.textContent = `${count} user${count > 1 ? "s" : ""}`;
    }
    userCountEl.textContent = count;
  });

  // typing indicator from server (optional)
  socket.on("user_typing", ({ room, user }) => {
    if (room !== currentRoom) return;
    typingIndicator.style.display = "block";
    typingIndicator.textContent = `${user || "Someone"} is typing...`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => (typingIndicator.style.display = "none"), 1200);
  });
}

// connect now
connectSocket();

// ----------------- Send message -----------------
function sendMessage(payload) {
  if (!socket || socket.disconnected) {
    console.warn("Socket not connected");
    return;
  }
  socket.emit("send_message", payload);
  // append locally (optimistic)
  appendMessage(payload);
}

// ----------------- Form submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  const payload = {
    text,
    user: username || "Anonymous",
    time: Date.now(),
    room: currentRoom,
    id: Math.random().toString(36).slice(2),
  };

  sendMessage(payload);
  messageInput.value = "";
});

// ----------------- Typing indicator (emit)
let typingTimer = null;
messageInput.addEventListener("input", () => {
  if (!socket) return;
  socket.emit("typing", { room: currentRoom, user: username || "Anonymous" });

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    // stop typing -> optional: you can emit a stopped typing event
  }, 900);
});

// ----------------- Create new room
createRoomBtn.addEventListener("click", () => {
  const r = (newRoomInput.value || "").trim();
  if (!r) return;
  const normalized = r.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  rooms.add(normalized);
  newRoomInput.value = "";
  switchRoom(normalized);
  renderRooms();
});

// ----------------- Switch room
function switchRoom(r) {
  currentRoom = r;
  sessionStorage.setItem("rc_room", currentRoom);
  roomTitle.textContent = `# ${currentRoom}`;
  messageInput.placeholder = `Message #${currentRoom} (press Enter to send)`;
  // clear messages (client-side only)
  messagesEl.innerHTML = "";
  // tell server (if supported)
  if (socket && socket.connected) {
    socket.emit("join_room", { room: currentRoom, user: username });
  }
  renderRooms();
}

// ----------------- Username save
saveNameBtn.addEventListener("click", () => {
  const v = (usernameInput.value || "").trim();
  if (!v) return alert("Enter a name");
  username = v;
  sessionStorage.setItem("rc_username", username);
  usernameInput.blur();
});

// ----------------- Nice UX: enter key behavior for username
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveNameBtn.click();
});

// ----------------- Initial demo messages (optional)
appendMessage({
  text: `Welcome to #${currentRoom}. This chat is local to this demo. Type a message to start.`,
  user: "System",
  time: Date.now(),
  room: currentRoom,
});