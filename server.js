const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userId = null;

  ws.on('message', (message) => {
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);
        if (data.type === 'join') {
          currentRoom = data.room;
          userId = data.userId;
          if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Map());
          const roomUsers = rooms.get(currentRoom);
          roomUsers.set(userId, ws);

          // Notify others in room of new user
          for (const [uid, sock] of roomUsers.entries()) {
            if (uid !== userId && sock.readyState === WebSocket.OPEN) {
              sock.send(JSON.stringify({ type: 'user-joined', userId }));
              ws.send(JSON.stringify({ type: 'user-joined', userId: uid })); // let new user know existing ones
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    } else {
      // Binary audio data with userId header: send to everyone else in room
      if (!currentRoom) return;
      const roomUsers = rooms.get(currentRoom);
      for (const [uid, sock] of roomUsers.entries()) {
        if (uid !== userId && sock.readyState === WebSocket.OPEN) {
          sock.send(message);
        }
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom && userId) {
      const roomUsers = rooms.get(currentRoom);
      if (roomUsers) {
        roomUsers.delete(userId);
        for (const [uid, sock] of roomUsers.entries()) {
          if (sock.readyState === WebSocket.OPEN) {
            sock.send(JSON.stringify({ type: 'user-left', userId }));
          }
        }
        if (roomUsers.size === 0) rooms.delete(currentRoom);
      }
    }
  });
});

console.log('Voice Chat WebSocket server running on port 8080');
