const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const rooms = {};

app.use(express.static(__dirname + '/public'));

io.on('connection', socket => {
  socket.on('create', roomCode => {
    socket.join(roomCode);
    socket.roomCode = roomCode;
    rooms[roomCode] = rooms[roomCode] || [];
    rooms[roomCode].push(socket.id);
  });

  socket.on('join', roomCode => {
    socket.join(roomCode);
    socket.roomCode = roomCode;
    rooms[roomCode] = rooms[roomCode] || [];
    rooms[roomCode].push(socket.id);
  });

  socket.on('ready', roomCode => {
    const peers = rooms[roomCode] || [];
    peers.forEach(peerId => {
      if (peerId !== socket.id) {
        io.to(peerId).emit("user-joined", { userId: socket.id });
        socket.emit("user-joined", { userId: peerId });
      }
    });
  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    const room = rooms[socket.roomCode];
    if (room) {
      rooms[socket.roomCode] = room.filter(id => id !== socket.id);
      socket.to(socket.roomCode).emit("user-left", { userId: socket.id });
    }
  });
});

server.listen(3000, () => {
  console.log('Voice server running on port 3000');
});
