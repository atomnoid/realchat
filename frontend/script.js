const socket = io("http://localhost:3000");

function sendMessage() {
  const message = document.getElementById("messageInput").value;

  if (message.trim() === "") return;

  socket.emit("send_message", {
    text: message,
    time: new Date().toLocaleTimeString(),
  });

  document.getElementById("messageInput").value = "";
}

socket.on("receive_message", (data) => {
  const li = document.createElement("li");
  li.textContent = `${data.time} — ${data.text}`;
  
  document.getElementById("messages").appendChild(li);
});
