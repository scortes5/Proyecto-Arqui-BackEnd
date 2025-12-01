require('dotenv').config();
const mqtt = require('mqtt');
const MQTT_CONFIG = require('./config/config');
const { handlePropertyInfo } = require('./handlers/onInfo');
const { handlePropertyRequest } = require('./handlers/onRequest');
const { handlePropertyValidation } = require('./handlers/onValidation');
const { handleAuctionMessage } = require('./handlers/onAuction');
const { setMqttClient, publishPendingAppointments, publishConfirmedAppointments, publishPendingAuctions } = require('./services/publisher');


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

    // Al iniciar el servicio MQTT
    (async function confirmedLoop() {
      try {
        await publishConfirmedAppointments();
      } catch (err) {
        console.error("Error en el ciclo de 'ConfirmedAppointments':", err.message);
      }
      // Espera 5 segundos DESPUÉS de que termine la ejecución
      setTimeout(confirmedLoop, 10000);
    })(); // El () al final la ejecuta por primera vez

    // Función "loop" auto-ejecutable para citas pendientes
    (async function pendingLoop() {
      try {
        await publishPendingAppointments();
      } catch (err) {
        console.error("Error en el ciclo de 'PendingAppointments':", err.message);
      }
      // Espera 5 segundos DESPUÉS de que termine la ejecución
      setTimeout(pendingLoop, 45000);
    })();

    // Función "loop" auto-ejecutable para auctions pendientes
    (async function pendingAuctionsLoop() {
      try {
        await publishPendingAuctions();
      } catch (err) {
        console.error("Error en el ciclo de 'PendingAuctions':", err.message);
      }
      // Espera 5 segundos DESPUÉS de que termine la ejecución
      setTimeout(pendingAuctionsLoop, 45000);
    })();

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
        case MQTT_CONFIG.channels.PROPERTIES_AUCTIONS:
          await handleAuctionMessage(message);
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
connectToBroker();

module.exports = { client };