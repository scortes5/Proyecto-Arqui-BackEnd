const { fibonacciRetry } = require('../utils/retry');

async function handleAuctionMessage(message) {
    try {
        const raw = message.toString();

        // Intentar parsear el JSON
        let auction;
        try {
            auction = JSON.parse(raw);
        } catch (parseError) {
            console.error('Error parseando JSON de subasta:', raw);
            return;
        }

        // Validar campos
        const required = [
            "auction_id",
            "proposal_id",
            "url",
            "timestamp",
            "quantity",
            "group_id",
            "operation",
        ];

        for (const f of required) {
            if (auction[f] === undefined) {
                console.error(`Falta campo '${f}'`, auction);
                return;
            }
        }

        // Validar operación
        const validOps = ["offer", "proposal", "acceptance", "rejection"];

        if (!validOps.includes(auction.operation)) {
            console.error("Operación inválida:", auction.operation);
            return;
        }

        // Enviar mensaje al backend interno con retry
        await fibonacciRetry(async () => {
            const response = await fetch(
                `${process.env.API_URL}/groupAppointments/auctions`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(auction),
                }
            );

            if (response.status >= 500 && response.status < 600) {
                throw new Error(
                    `Error API ${response.status}: ${await response.text()}`
                );
            }

            const result = await response.json();
            console.log(
                `Mensaje procesado: ${auction.operation} - auction: ${auction.auction_id}`
            );

            return result;
        });
    } catch (err) {
        console.error("Error al procesar mensaje broker:", err.message);
    }
}

module.exports = { handleAuctionMessage };
