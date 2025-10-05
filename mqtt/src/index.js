require('dotenv').config();
const mqtt = require('mqtt');
const MQTT_CONFIG = require('./config/config');
const { handlePropertyInfo } = require('./handlers/onInfo');
const { handlePropertyRequest } = require('./handlers/onRequest');
const { handlePropertyValidation } = require('./handlers/onValidation');
const { setMqttClient } = require('./services/publisher');

let client;

function connectToBroker() {
  client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

  // Hacer el cliente disponible para el publisher
  setMqttClient(client);

  client.on('connect', () => {
    console.log('🟢 Conectado al broker MQTT');
    console.log(`Broker: ${MQTT_CONFIG.brokerUrl}`);
    console.log(`Cliente ID: ${MQTT_CONFIG.options.clientId}`);
    
    // Suscribirse a todos los canales necesarios (RF06)
    Object.entries(MQTT_CONFIG.channels).forEach(([name, channel]) => {
      client.subscribe(channel, (err) => {
        if (err) {
          console.error(`❌ Error suscribiéndose a ${channel}:`, err);
        } else {
          console.log(`Suscrito a ${channel}`);
        }
      });
    });
  });

  client.on('message', async (topic, message) => {
    try {
      // Rutear según el canal
      switch (topic) {
        case MQTT_CONFIG.channels.PROPERTIES_INFO:
          await handlePropertyInfo(message);
          break;
        case MQTT_CONFIG.channels.PROPERTIES_REQUESTS:
          await handlePropertyRequest(message);
          break;
        case MQTT_CONFIG.channels.PROPERTIES_VALIDATION:
          await handlePropertyValidation(message);
          break;
        default:
          console.log(`Mensaje en canal no manejado: ${topic}`);
      }
    } catch (err) {
      console.error('❌ Error procesando mensaje:', err);
    }
  });

  client.on('error', (err) => {
    console.error('❌ Error de conexión MQTT:', err);
  });

  client.on('offline', () => {
    console.log('❌ Cliente MQTT offline');
  });

  client.on('reconnect', () => {
    console.log('Reconectando al broker...');
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nCerrando conexión MQTT...');
  if (client) {
    client.end(false, () => {
      console.log('Desconectado del broker');
      process.exit(0);
    });
  }
});

// Iniciar el servicio
console.log('🚀 Iniciando servicio MQTT...');
connectToBroker();

module.exports = { client };