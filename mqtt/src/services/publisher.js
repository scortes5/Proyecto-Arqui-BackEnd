const { fibonacciRetry } = require('../utils/retry');

let mqttClient = null;

// ====================================================
// 🧩 UTILIDADES BÁSICAS DEL CLIENTE MQTT
// ====================================================

function setMqttClient(client) {
  mqttClient = client;
  console.log('Cliente MQTT configurado en el publisher');
}

function isClientReady() {
  return mqttClient !== null && mqttClient.connected;
}

function getClientStatus() {
  return {
    initialized: mqttClient !== null,
    connected: mqttClient ? mqttClient.connected : false,
    reconnecting: mqttClient ? mqttClient.reconnecting : false
  };
}

// ====================================================
// 📦 MANEJO DE SOLICITUDES PENDIENTES (status === 'PENDING')
// ====================================================

async function getPendingAppointments() {
  const response = await fetch(`${process.env.API_URL}/appointments/all`);

  if (!response.ok) {
    throw new Error(`Error consultando appointments: ${response.status}`);
  }

  const appointments = await response.json();
  return appointments.filter(a => a.status === 'PENDING');
}

async function publishPendingAppointments() {
  if (!isClientReady()) {
    console.warn('MQTT client no listo. No se pueden publicar pendientes.');
    return;
  }

  try {
    const pendingRequests = await getPendingAppointments();

    if (pendingRequests.length > 0)
      console.log(`Se encontraron ${pendingRequests.length} solicitudes pendientes.`);

    for (const request of pendingRequests) {
      try {
        await publishPurchaseRequest({
          request_id: request.request_id,
          deposit_token: request.deposit_token,
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

// ====================================================
// 🛒 PUBLICACIÓN DE SOLICITUDES DE COMPRA (canal: properties/requests)
// ====================================================

async function publishPurchaseRequest(requestData) {
  if (!isClientReady()) throw new Error('Cliente MQTT no inicializado');

  const requiredFields = ['request_id', 'group_id', 'url', 'timestamp'];
  const missingFields = requiredFields.filter(field => !requestData[field]);
  if (missingFields.length > 0)
    throw new Error(`Faltan campos de REQUEST: ${missingFields.join(', ')}`);

  return await fibonacciRetry(async () => {
    return new Promise((resolve, reject) => {
      if (!mqttClient.connected) return reject(new Error('Cliente MQTT no conectado'));

      const message = JSON.stringify(requestData);
      const channel = 'properties/requests';

      mqttClient.publish(channel, message, { qos: 1 }, (err) => {
        if (err) {
          console.error('(publisher requests) ❌ Error:', err.message);
          reject(err);
        } else {
          // console.log(`(publisher requests) Publicado: ${requestData.request_id}`);
          resolve();
        }
      });
    });
  }, 5);
}

// ====================================================
// ✅ MANEJO DE VALIDACIONES (status === 'ACCEPTED' o 'REJECTED')
// ====================================================

async function getConfirmedAppointments() {
  const response = await fetch(`${process.env.API_URL}/appointments/all`);
  if (!response.ok)
    throw new Error(`Error consultando appointments: ${response.status}`);

  const appointments = await response.json();

  return appointments.filter(a =>
    (a.status === 'ACCEPTED' || a.status === 'REJECTED') &&
    a.validation_published === false
  );
}

async function markValidationAsPublishedInDB(request_id) {
  const url = `${process.env.API_URL}/appointments/${request_id}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ validation_published: true })
  });

  if (!response.ok)
    throw new Error(`API falló al marcar ${request_id} como publicado (${response.status})`);

  return await response.json();
}

async function publishPurchaseValidation(validationData) {
  if (!isClientReady()) throw new Error('Cliente MQTT no inicializado');

  const requiredFields = ['request_id', 'status', 'timestamp'];
  const missingFields = requiredFields.filter(field => !validationData[field]);
  if (missingFields.length > 0)
    throw new Error(`Faltan campos de VALIDACIÓN: ${missingFields.join(', ')}`);

  return await fibonacciRetry(async () => {
    return new Promise((resolve, reject) => {
      if (!mqttClient.connected) return reject(new Error('Cliente MQTT no conectado'));

      const message = JSON.stringify(validationData);
      const channel = 'properties/validation';

      mqttClient.publish(channel, message, { qos: 1 }, (err) => {
        if (err) {
          console.error('(publisher validation) Error:', err.message);
          reject(err);
        } else {
          console.log(`(publisher validation) Publicado: ${validationData.request_id}`);
          resolve();
        }
      });
    });
  }, 5);
}

async function publishConfirmedAppointments() {
  if (!isClientReady()) {
    console.warn('MQTT client no listo. No se pueden publicar validaciones.');
    return;
  }

  try {
    const pendingValidations = await getConfirmedAppointments();

    if (pendingValidations.length > 0)
      console.log(`Se encontraron ${pendingValidations.length} validaciones pendientes por publicar.`);

    for (const validation of pendingValidations) {
      try {

        await publishPurchaseValidation({
          request_id: validation.request_id,
          status: validation.status,
          timestamp: validation.updated_at || new Date().toISOString(),
          reason: validation.reason || (validation.status === 'ACCEPTED' ? 'Pago exitoso' : 'Pago rechazado')
        });

        await markValidationAsPublishedInDB(validation.request_id);
      } catch (err) {
        console.error(`Error procesando validación ${validation.request_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error en el ciclo de publicación de pendientes:', err.message);
  }
}

// ====================================================
// ✅ MANEJO DE AUCTIONS
// ====================================================

async function publishAuction(auctionData) {
  if (!isClientReady()) throw new Error('Cliente MQTT no inicializado');

  // proposal_id es opcional (puede ser null en offers)
  const requiredFields = ['auction_id', 'quantity', 'group_id', 'url', 'timestamp', 'operation'];
  const missingFields = requiredFields.filter(field => !auctionData[field]);
  if (missingFields.length > 0)
    throw new Error(`Faltan campos de AUCTION: ${missingFields.join(', ')}`);

  console.log(`(publisher auctions) 📤 Intentando publicar auction:`, {
    auction_id: auctionData.auction_id,
    operation: auctionData.operation,
    group_id: auctionData.group_id,
    url: auctionData.url
  });

  return await fibonacciRetry(async () => {
    return new Promise((resolve, reject) => {
      if (!mqttClient.connected) return reject(new Error('Cliente MQTT no conectado'));

      const message = JSON.stringify(auctionData);
      const channel = 'properties/auctions';

      mqttClient.publish(channel, message, { qos: 1 }, (err) => {
        if (err) {
          console.error('(publisher auctions) ❌ Error publicando:', err.message);
          reject(err);
        } else {
          console.log(`(publisher auctions) ✅ Publicado exitosamente: ${auctionData.auction_id}`);
          resolve();
        }
      });
    });
  }, 5);
}

async function markAuctionAsPublishedInDB(auction_id) {
  const url = `${process.env.API_URL}/auctions/${auction_id}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auction_published: true })
  });

  if (!response.ok)
    throw new Error(`API falló al marcar ${auction_id} como publicado (${response.status})`);

  return await response.json();
}

async function publishPendingAuctions() {
  if (!isClientReady()) {
    console.warn('⚠️ MQTT client no listo. No se pueden publicar auctions.');
    return;
  }

  try {
    console.log('🔍 (publishPendingAuctions) Consultando auctions desde API...');
    const response = await fetch(`${process.env.API_URL}/auctions`);

    if (!response.ok) {
      throw new Error(`Error consultando auctions: ${response.status}`);
    }

    const allAuctions = await response.json();
    console.log(`📊 (publishPendingAuctions) Total auctions en DB: ${allAuctions.length}`);

    const auctionsToPublish = allAuctions.filter(auction =>
      auction.group_id === 4 && auction.published === false
    );

    console.log(`📋 (publishPendingAuctions) Auctions pendientes (group_id=4, published=false): ${auctionsToPublish.length}`);

    if (auctionsToPublish.length > 0) {
      console.log(`🚀 Iniciando publicación de ${auctionsToPublish.length} auctions...`);
      auctionsToPublish.forEach((a, idx) => {
        console.log(`  ${idx + 1}. auction_id: ${a.auction_id}, operation: ${a.operation}, url: ${a.url}`);
      });
    }

    for (const auction of auctionsToPublish) {
      try {
        console.log(`\n📤 Procesando auction ${auction.auction_id}...`);

        await publishAuction({
          auction_id: auction.auction_id,
          proposal_id: auction.proposal_id || null,
          url: auction.url,
          timestamp: auction.updated_at || new Date().toISOString(),
          quantity: auction.quantity,
          group_id: auction.group_id,
          operation: auction.operation,
        });

        console.log(`✅ Marcando auction ${auction.auction_id} como publicada en DB...`);
        await markAuctionAsPublishedInDB(auction.auction_id);
        console.log(`✅ Auction ${auction.auction_id} completamente procesada`);

      } catch (err) {
        console.error(`❌ Error procesando auction ${auction.auction_id}:`, err.message);
      }
    }

    if (auctionsToPublish.length > 0) {
      console.log(`\n✅ Ciclo de publicación de auctions completado\n`);
    }

  } catch (err) {
    console.error('❌ Error en el ciclo de publicación de auctions:', err.message);
  }
}

// ====================================================
// 🧾 EXPORTS
// ====================================================

module.exports = {
  // Publicaciones
  publishPurchaseRequest,
  publishPurchaseValidation,
  // Pendientes
  publishPendingAppointments,
  // Confirmadas / rechazadas
  publishConfirmedAppointments,
  // Utilidades
  setMqttClient,
  isClientReady,
  getClientStatus,
  publishPendingAuctions

};
