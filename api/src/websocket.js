const { Server } = require('socket.io');

let io;

const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  // Middleware de autenticación opcional
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    
    if (userId) {
      socket.userId = userId;
      console.log(`🔐 Usuario autenticado: ${userId}`);
    }
    
    next();
  });

  io.on('connection', (socket) => {
    console.log(`✅ Cliente WebSocket conectado: ${socket.id}`);

    // Unir a sala de usuario autenticado
    if (socket.userId) {
      socket.join(`user-${socket.userId}`);
      console.log(`👤 Usuario ${socket.userId} unido a su sala privada`);
    }

    // Unir a sala pública (para eventos globales)
    socket.join('public');

    // Evento para unirse manualmente a salas
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      socket.userId = userId;
      console.log(`👤 Usuario ${userId} unido manualmente a su sala`);
    });

    // Evento de ping para mantener conexión
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Cliente WebSocket desconectado: ${socket.id}`);
    });
  });

  console.log('🔌 WebSocket inicializado correctamente');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado. Llama a initializeWebSocket primero.');
  }
  return io;
};

// Funciones helper para emitir eventos
const emitToUser = (userId, event, data) => {
  const io = getIO();
  io.to(`user-${userId}`).emit(event, data);
  console.log(`📤 Evento '${event}' enviado a usuario ${userId}`);
};

const emitToPublic = (event, data) => {
  const io = getIO();
  io.to('public').emit(event, data);
  console.log(`📢 Evento '${event}' enviado a sala pública`);
};

const emitToAll = (event, data) => {
  const io = getIO();
  io.emit(event, data);
  console.log(`🌐 Evento '${event}' enviado a todos los clientes`);
};

module.exports = { 
  initializeWebSocket, 
  getIO,
  emitToUser,
  emitToPublic,
  emitToAll
};