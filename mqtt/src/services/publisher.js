const { fibonacciRetry } = require('../utils/retry');



let mqttClient = null;

async function getPendingAppointments() {
  console.log(process.env.API_URL);
  const response = await fetch(`${process.env.API_URL}/appointments/all`);
  
  if (!response.ok) {
    throw new Error(`Error consultando appointments: ${response.status}`);
  }

  const appointments = await response.json();
  
  // Filtrar solo las que están pendientes
  return appointments.filter(a => a.status === 'PENDING');
}

async function publishPendingAppointments() {
  if (!isClientReady()) {
    console.warn('MQTT client no listo. No se pueden publicar pendientes.');
    return;
  }

  try {
    const pendingRequests = await getPendingAppointments();
    console.log(`Se encontraron ${pendingRequests.length} solicitudes pendientes.`);

    for (const request of pendingRequests) {
      try {
        await publishPurchaseRequest({
          request_id: request.request_id,
          group_id: request.group_id,
          url: request.property_url,
          timestamp: request.created_at,
          origin: 0,
          operation: 'BUY'
        });
      } catch (err) {
        console.error(`Error publicando request ${request.request_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error sincronizando pendientes:', err.message);
  }
}


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
  getClientStatus,
  publishPendingAppointments
};