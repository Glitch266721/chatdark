const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");

app.use(express.static("public"));

const rooms = {}; // { [roomName]: { password, users: [], messages: [] } }

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room, password }) => {
    if (!rooms[room]) {
      rooms[room] = { password, users: [], messages: [] };
    } else if (rooms[room].password !== password) {
      socket.emit("errorMessage", "Incorrect password for this room.");
      return;
    }

    if (rooms[room].users.includes(username)) {
      socket.emit("errorMessage", "Username already taken in this room.");
      return;
    }

    socket.username = username;
    socket.room = room;

    socket.join(room);

    rooms[room].users.push(username);

    // Send chat history
    socket.emit("chatHistory", rooms[room].messages);

    // Notify room
    io.to(room).emit("chat message", `🔐 ${username} joined the room.`);
  });

  socket.on("chat message", (msg) => {
    const room = socket.room;
    const username = socket.username;

    if (!room || !rooms[room]) return;

    // Handle /save command
    if (msg.startsWith("/save")) {
      const chatText = rooms[room].messages.join("\n");
      const filename = `${room}_chat.txt`;

      // Write chat history to a text file
      fs.writeFile(`./public/${filename}`, chatText, (err) => {
        if (err) {
          socket.emit("errorMessage", "Failed to save the chat.");
          return;
        }
        socket.emit("download", filename);
      });

      return;
    }

    const fullMessage = `${username}: ${msg}`;
    rooms[room].messages.push(fullMessage);
    io.to(room).emit("chat message", fullMessage);
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
  console.log("Server running on port 3000");
});
