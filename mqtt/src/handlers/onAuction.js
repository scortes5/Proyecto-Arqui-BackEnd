const { fibonacciRetry } = require('../utils/retry');

async function handleAuctionMessage(message) {
    const startTime = Date.now();
    const raw = message.toString();

    console.log("──────────────────────────────────────────────");
    console.log("🟦 [AuctionConsumer] Mensaje recibido del broker:");
    console.log(raw);
    console.log("──────────────────────────────────────────────");

    try {
        // Parseo seguro
        let auction;
        try {
            auction = JSON.parse(raw);
            console.log("🟩 JSON parseado correctamente:", auction);
        } catch (parseError) {
            console.error("🟥 Error parseando JSON:", parseError.message);
            console.error("Contenido recibido:", raw);
            return;
        }

        // Validación de campos requeridos
        const required = [
            "auction_id",
            "proposal_id",
            "url",
            "timestamp",
            "quantity",
            "group_id",
            "operation",
        ];

        for (const field of required) {
            if (auction[field] === undefined) {
                console.error(`🟥 Falta campo obligatorio '${field}'`);
                console.error("Payload:", auction);
                return;
            }
        }

        // Validar operación
        const validOps = ["offer", "proposal", "acceptance", "rejection"];
        if (!validOps.includes(auction.operation)) {
            console.error(
                `🟥 Operación inválida '${auction.operation}'. Debe ser una de: ${validOps.join(", ")}`
            );
            return;
        }

        console.log(
            `🟦 Procesando operación '${auction.operation}' para group_id=${auction.group_id}`
        );

        // Ejecutar POST con reintentos
        await fibonacciRetry(async (attempt) => {
            console.log(`🔄 Intento #${attempt} → enviando a API interna...`);

            const response = await fetch(`${process.env.API_URL}/auctions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(auction),
            });

            console.log(`🟨 API respondió con status: ${response.status}`);

            if (!response.ok) {
                const txt = await response.text();
                console.error(`🟥 Error al llamar API (status ${response.status})`);
                console.error("Respuesta completa:", txt);
                throw new Error(`Error API ${response.status}: ${txt}`);
            }

            const result = await response.json();
            console.log("🟩 Respuesta exitosa API:", result);

            return result;
        });

        console.log(
            `🟩 Mensaje procesado correctamente: operation=${auction.operation}, auction_id=${auction.auction_id}`
        );
    } catch (err) {
        console.error("🟥 Error general al procesar mensaje broker:");
        console.error(err.stack || err.message);
    } finally {
        const total = Date.now() - startTime;
        console.log(`⏱️  Tiempo total procesamiento: ${total}ms`);
        console.log("──────────────────────────────────────────────\n");
    }
}


module.exports = { handleAuctionMessage };
