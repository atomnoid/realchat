import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

// test socket connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Receive message from a user
  socket.on("send_message", (data) => {
    console.log("Message received:", data);

    // Send message to all connected users
    io.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


server.listen(3000, () => {
  console.log("Server running on port 3000");
});
