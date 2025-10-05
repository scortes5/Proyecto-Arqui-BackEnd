const { fibonacciRetry } = require('../utils/retry');

async function handlePropertyInfo(message) {
  try {
    const raw = message.toString();
    const property = JSON.parse(raw);
    
    if (!property.name || !property.price || !property.url) {
      console.error('❌ Propiedad inválida, faltan campos requeridos:', property);
      return;
    }

    console.log(`Nueva propiedad recibida: ${property.name} - $${property.price} ${property.currency}`);


    await fibonacciRetry(async () => {
      const response = await fetch(`${process.env.API_URL}/properties`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        
        },
        body: JSON.stringify(property),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API respondió con ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Propiedad guardada: ${result.name} (ID: ${result.id})`);
      return result;
    });

  } catch (err) {
    console.error('❌ Error al procesar propiedad:', err.message);
    // Posible dead letter queue o log persistente
  }
}

module.exports = { handlePropertyInfo };
