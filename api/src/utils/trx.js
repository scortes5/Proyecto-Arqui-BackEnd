const transbankSdk = require('transbank-sdk');
const { WebpayPlus } = transbankSdk;
const { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = transbankSdk;

// Declarar la variable de transacción fuera del bloque de entorno.
let tx;

// Lógica para asegurar una única instancia (Singleton) de la transacción
if (process.env.NODE_ENV === "production") {
    // En producción, inicializar la transacción con las credenciales de integración.
    // NOTA: En un entorno real de producción, deberías usar las credenciales y el Environment.Production.
    tx = new WebpayPlus.Transaction(
        new Options(
            IntegrationCommerceCodes.WEBPAY_PLUS,
            IntegrationApiKeys.WEBPAY,
            Environment.Integration // ¡Reemplazar por Environment.Production en un entorno real!
        )
    );
} else {
    // En desarrollo, usar la variable global para reusar la instancia
    // y evitar problemas de configuración en recargas (hot reloading).
    if (!global.__tx__) {
        global.__tx__ = new WebpayPlus.Transaction(
            new Options(
                IntegrationCommerceCodes.WEBPAY_PLUS,
                IntegrationApiKeys.WEBPAY,
                Environment.Integration
            )
        );
    }
    tx = global.__tx__;
}

// Exportar la instancia de la transacción
module.exports = { tx };