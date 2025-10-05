const { fibonacciRetry } = require('../utils/retry');

let mqttClient = null;

/**
 * Establece el cliente MQTT que se usará para publicar
 * @param {Object} client - Cliente MQTT conectado
 */
function setMqttClient(client) {
  mqttClient = client;
  console.log('Cliente MQTT configurado en el publisher');
}

/**
 * Publica una solicitud de compra en el broker MQTT con retry fibonacci
 * @param {Object} requestData - Datos de la solicitud
 * @param {string} requestData.request_id - UUID de la solicitud
 * @param {string} requestData.group_id - ID del grupo
 * @param {string} requestData.url - URL de la propiedad
 * @param {number} requestData.origin - Origen (0 por defecto)
 * @param {string} requestData.operation - Operación (BUY por defecto)
 * @param {string} requestData.timestamp - Timestamp ISO 8601
 * @returns {Promise<void>}
 */
async function publishPurchaseRequest(requestData) {
  // Validar que el cliente esté conectado
  if (!mqttClient) {
    throw new Error('Cliente MQTT no inicializado');
  }

  // Validar campos requeridos
  const requiredFields = ['request_id', 'group_id', 'url', 'timestamp'];
  const missingFields = requiredFields.filter(field => !requestData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
  }

  // Aplicar retry fibonacci a la publicación
  return await fibonacciRetry(async () => {
    return new Promise((resolve, reject) => {
      // Verificar que siga conectado en cada intento
      if (!mqttClient.connected) {
        throw new Error('Cliente MQTT no conectado');
      }

      const message = JSON.stringify(requestData);
      const channel = 'properties/requests';

      console.log(`Publicando solicitud: ${requestData.request_id}`);

      mqttClient.publish(channel, message, { qos: 1 }, (err) => {
        if (err) {
          console.error('Error publicando solicitud:', err.message);
          reject(err);
        } else {
          console.log(`Solicitud publicada exitosamente: ${requestData.request_id}`);
          resolve();
        }
      });
    });
  }, 5); // 5 reintentos con secuencia fibonacci: 1s, 1s, 2s, 3s, 5s
}

/**
 * Verifica si el cliente MQTT está disponible y conectado
 * @returns {boolean}
 */
function isClientReady() {
  return mqttClient !== null && mqttClient.connected;
}

/**
 * Obtiene el estado del cliente MQTT
 * @returns {Object}
 */
function getClientStatus() {
  return {
    initialized: mqttClient !== null,
    connected: mqttClient ? mqttClient.connected : false,
    reconnecting: mqttClient ? mqttClient.reconnecting : false
  };
}

module.exports = { 
  publishPurchaseRequest,
  setMqttClient,
  isClientReady,
  getClientStatus
};