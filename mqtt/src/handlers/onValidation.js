const { fibonacciRetry } = require('../utils/retry');

async function handlePropertyValidation(message) {
  try {
    const raw = message.toString();
    
    // Intentar parsear el JSON
    let validation;
    try {
      validation = JSON.parse(raw);
    } catch (parseError) {
      console.error('Error parseando JSON de validación:', raw);
      return;
    }

    // Validar que sea un objeto
    if (!validation || typeof validation !== 'object') {
      console.error('Validación no es un objeto válido:', raw);
      return;
    }

    // Validar campos requeridos
    if (!validation.request_id || !validation.status || !validation.timestamp) {
      console.error('Validación inválida, faltan campos requeridos:', validation);
      return;
    }

    // if (!validation.deposit_token) {
    //   console.error('(onValidation) 🔑 Missing Token:', validation.request_id);
    //   return;
    // }

    // console.log(`(onValidation) Validación recibida: ${validation.request_id} - Status: ${validation.status}`);

    await fibonacciRetry(async () => {
      const response = await fetch(`${process.env.API_URL}/appointments/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation),
      });

      if (response.status >= 500 && response.status < 600) {
        const errorText = await response.text();
        
        
        throw new Error(`API respondió con ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`Validación procesada: ${validation.request_id} - ${validation.status}`);
      return result;
    });

  } catch (err) {
    console.error('Error al procesar validación:', err.message);
  }
}

module.exports = { handlePropertyValidation };