
const { fibonacciRetry } = require('../utils/retry');

async function handlePropertyRequest(message) {
  const raw = message.toString();
  const request = JSON.parse(raw);
  try {
    
    // Validar esquema
    if (!request.request_id || !request.group_id || !request.url) {
      console.error('(onRequest) ❌ Solicitud inválida, faltan campos requeridos:', request);
      return;
    }

    // if (!request.deposit_token) {
    //   console.error('(onRequest) 🔑 Solicitud sin token');
    //   return;
    // }


    // console.log(`(onRequest) Solicitud de compra detectada: ${request.request_id} (Grupo: ${request.group_id})`);
    // Log the entire request object
    // console.log('📦 Request completa:', JSON.stringify(request, null, 2));

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
      // console.log(`(onRequest) ✅ Solicitud registrada: ${request.request_id}`);
      return result;
    });

  } catch (err) {
    console.error('(onRequest) ❌ Error al procesar solicitud:', err.message, err.status);
    console.log('\t(onRequest)  Request completa:', JSON.stringify(request, null, 2));
  }
}

module.exports = { handlePropertyRequest }