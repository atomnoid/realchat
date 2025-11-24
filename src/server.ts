import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// ----------------- SOCKET.IO SERVER -----------------
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// store room users
const roomUsers: Record<string, number> = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // joining a room
  socket.on("join_room", ({ room, user }) => {
    socket.join(room);

    roomUsers[room] = (roomUsers[room] || 0) + 1;

    io.to(room).emit("room_users", {
      room,
      count: roomUsers[room]
    });

    console.log(`${user} joined ${room}`);
  });

  // receiving a message from a user
  socket.on("send_message", (data) => {
    const { room } = data;
    socket.to(room).emit("receive_message", data);
  });

  // typing event
  socket.on("typing", ({ room, user }) => {
    socket.to(room).emit("user_typing", { room, user });
  });

  // handle disconnect
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((room) => {
      if (roomUsers[room]) {
        roomUsers[room]--;
        io.to(room).emit("room_users", {
          room,
          count: roomUsers[room]
        });
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});
