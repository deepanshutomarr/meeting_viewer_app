import { Server } from 'socket.io';

let io = null;
const connectedClients = new Map(); // userId -> socket.id

export function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5174',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle user identification
    socket.on('identify', (userId) => {
      connectedClients.set(userId, socket.id);
      socket.userId = userId;
      console.log(`User identified: ${userId}`);

      // Send confirmation
      socket.emit('identified', { userId, socketId: socket.id });
    });

    // Handle manual refresh request
    socket.on('request_refresh', (data) => {
      console.log(`Refresh requested by ${socket.userId}`);
      socket.emit('refresh_meetings', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedClients.delete(socket.userId);
        console.log(`User disconnected: ${socket.userId}`);
      }
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

export function notifyUser(userId, event, data) {
  if (!io) {
    console.warn('WebSocket not initialized');
    return false;
  }

  const socketId = connectedClients.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    console.log(`Sent ${event} to user ${userId}`);
    return true;
  }

  return false;
}

export function broadcastToAll(event, data) {
  if (!io) {
    console.warn('WebSocket not initialized');
    return;
  }

  io.emit(event, data);
  console.log(`Broadcast ${event} to all clients`);
}

export function notifyCalendarUpdate(userId, updateType, meetings) {
  return notifyUser(userId, 'calendar_updated', {
    type: updateType,
    meetings,
    timestamp: new Date().toISOString(),
  });
}

export function getConnectedClients() {
  return Array.from(connectedClients.keys());
}

export default { initializeWebSocket, notifyUser, broadcastToAll, notifyCalendarUpdate };
