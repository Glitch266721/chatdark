const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {}; // { roomName: { password, users: [], messages: [] } }

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("joinRoom", ({ username, room, password }) => {
    if (!rooms[room]) {
      rooms[room] = { password, users: [], messages: [] };
    } else if (rooms[room].password !== password) {
      socket.emit("errorMessage", "Incorrect password.");
      return;
    }

    if (rooms[room].users.includes(username)) {
      socket.emit("errorMessage", "Username already in use.");
      return;
    }

    socket.username = username;
    socket.room = room;
    socket.join(room);
    rooms[room].users.push(username);

    socket.emit("chatHistory", rooms[room].messages);
    io.to(room).emit("chat message", `🔐 ${username} joined the room.`);
  });

  socket.on("chat message", (msg) => {
    const room = socket.room;
    const username = socket.username;
    if (!room) return;

    const fullMessage = `${username}: ${msg}`;
    rooms[room].messages.push(fullMessage);
    io.to(room).emit("chat message", fullMessage);
  });

  socket.on("getUsers", () => {
    const room = socket.room;
    if (room && rooms[room]) {
      socket.emit("userList", rooms[room].users);
    }
  });

  socket.on("clearChat", () => {
    const room = socket.room;
    if (room && rooms[room]) {
      rooms[room].messages = [];
      io.to(room).emit("clearChat");
    }
  });

  socket.on("disconnect", () => {
    const room = socket.room;
    const username = socket.username;
    if (room && rooms[room]) {
      rooms[room].users = rooms[room].users.filter((u) => u !== username);
      io.to(room).emit("chat message", `❌ ${username} disconnected.`);
    }
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
