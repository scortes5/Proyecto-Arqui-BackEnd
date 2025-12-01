const NewRelic = require('newrelic');
const http = require('http');
const db = require("./src/models");
const app = require("./app");
const { initializeWebSocket } = require("./src/websocket");

db.sequelize.authenticate()
  .then(() => {
    console.log("✅ Conectado a la base de datos");
    
    const server = http.createServer(app.callback());
    const io = initializeWebSocket(server);
    
    app.context.io = io;
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 API + WebSocket corriendo en puerto ${PORT}`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/socket.io/`);
    });
  })
  .catch(err => {
    console.error("❌ Error al conectar a la base de datos:", err.message);
    process.exit(1);
  });