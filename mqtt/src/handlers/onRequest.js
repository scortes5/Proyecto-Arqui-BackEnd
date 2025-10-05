
const { fibonacciRetry } = require('../utils/retry');

async function handlePropertyRequest(message) {
  try {
    const raw = message.toString();
    const request = JSON.parse(raw);
    
    // Validar esquema
    if (!request.request_id || !request.group_id || !request.url) {
      console.error('❌ Solicitud inválida, faltan campos requeridos:', request);
      return;
    }

    console.log(`Solicitud de compra detectada: ${request.request_id} (Grupo: ${request.group_id})`);
    console.log(`   URL: ${request.url}`);
    // Log the entire request object
    console.log('📦 Request completa:', JSON.stringify(request, null, 2));
    
    if (request.details) {
      console.log(`   Detalles: ${JSON.stringify(request.details)}`);
    }

    // Enviar a la API para que descuente el stock temporalmente
    await fibonacciRetry(async () => {
      const response = await fetch(`${process.env.API_URL}/appointments/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API respondió con ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Solicitud registrada: ${request.request_id}`);
      return result;
    });

  } catch (err) {
    console.error('❌ Error al procesar solicitud:', err.message);
  }
}

module.exports = { handlePropertyRequest }