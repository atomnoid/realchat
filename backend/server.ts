import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3000 }, () => {
  console.log("🔥 WebSocket server running on ws://localhost:3000");
});

wss.on("connection", (ws) => {
  console.log("⚡ New client connected");

  ws.on("message", (msg) => {
    console.log("Message:", msg.toString());

    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg.toString());
      }
    });
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});
