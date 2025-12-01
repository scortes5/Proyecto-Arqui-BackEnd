const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware");
const { Auction } = require("../models");
const router = new Router();

// GET /auctions - Listar todas las subastas
router.get("/", async (ctx) => {
    const auctions = await Auction.findAll({
        order: [["createdAt", "DESC"]],
    });

    ctx.body = auctions.map((a) => ({
        auction_id: a.auction_id,
        proposal_id: a.proposal_id,
        url: a.url,
        timestamp: a.timestamp,
        quantity: a.quantity,
        group_id: a.group_id,
        operation: a.operation,
    }));
    ctx.status = 200;
});

// POST /auctions - Endpoint público (Workers/Brokers)
router.post("/", async (ctx) => {
    const {
        auction_id,
        proposal_id,
        url,
        timestamp,
        quantity,
        group_id,
        operation,
    } = ctx.request.body;

    // Validación básica de campos
    if (!auction_id || !timestamp || !quantity || !group_id || !operation) {
        ctx.throw(400, "Request Body Incompleto");
    }

    // ------------------------------------------
    // 1. OPERATION = "offer"
    // ------------------------------------------
    if (operation === "offer") {
        const [newOffer, created] = await Auction.findOrCreate({
            where: { auction_id },
            defaults: {
                proposal_id: proposal_id || null,
                url,
                timestamp,
                quantity,
                group_id,
                operation,
            }
        });

        if (!created) {
            ctx.status = 200;
            ctx.body = { message: "Offer ya existía (ignorada)", auction_id };
            return;
        }

        ctx.status = 201;
        ctx.body = { message: "Offer procesada", auction_id };
        return;
    }

    // ------------------------------------------
    // 2. OPERATION = "proposal"
    // ------------------------------------------
    if (operation === "proposal") {
        const offer = await Auction.findOne({
            where: {
                auction_id,
                operation: "offer",
            },
        });

        // Si no existe la oferta padre, ignoramos para que el worker no reviente
        if (!offer) {
            console.warn(`⚠️ Proposal recibida para oferta desconocida: ${auction_id}. Ignorando.`);
            ctx.status = 200;
            ctx.body = { message: "Ignorado: Offer padre no encontrada" };
            return;
        }

        if (offer.group_id !== 4) {
            ctx.throw(400, "El offer previo no tiene group_id == 4");
        }

        const [newProposal, created] = await Auction.findOrCreate({
            where: { auction_id }, // El auction_id del proposal es único
            defaults: {
                proposal_id,
                url,
                timestamp,
                quantity,
                group_id,
                operation,
            }
        });

        if (!created) {
            ctx.status = 200;
            ctx.body = { message: "Proposal ya existía (ignorada)", auction_id };
            return;
        }

        ctx.status = 201;
        ctx.body = { message: "Proposal registrada", auction_id };
        return;
    }

    // ------------------------------------------
    // 3. OPERATION = "acceptance"
    // ------------------------------------------
    if (operation === "acceptance") {
        // Intentar crear la aceptación primero (Idempotencia)
        const [newAcceptance, created] = await Auction.findOrCreate({
            where: { auction_id },
            defaults: {
                proposal_id,
                url,
                timestamp,
                quantity,
                group_id,
                operation,
            }
        });

        // Solo si la acabamos de crear, borramos la oferta vieja
        if (created) {
            const offer = await Auction.findOne({
                where: {
                    auction_id,
                    operation: "offer",
                },
            });

            if (offer) {
                await offer.destroy();
            }
        }

        // Validar si existe un proposal válido (solo informativo en este punto)
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        if (!proposal && created) {
            // Nota: No lanzamos error para no revertir la transacción, solo logueamos
            console.warn("⚠️ Acceptance creada pero no se encontró proposal local con group_id 4");
        }

        ctx.status = created ? 201 : 200;
        ctx.body = {
            message: created ? "Acceptance procesado. Oferta cerrada." : "Acceptance duplicada ignorada.",
            offer_cleaned: created
        };
        return;
    }

    // ------------------------------------------
    // 4. OPERATION = "rejection"
    // ------------------------------------------
    if (operation === "rejection") {
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        let wasDeleted = false;
        if (proposal) {
            await proposal.destroy();
            wasDeleted = true;
        } else {
            console.log("ℹ️ Rejection recibida pero la propuesta no existía o ya fue borrada.");
        }

        ctx.status = 200;
        ctx.body = { message: "Rejection procesado", deleted: wasDeleted };
        return;
    }

    ctx.throw(400, "Operación no permitida");
});

// POST /auctions/admin - Endpoint protegido para Admin
router.post("/admin", requireAdmin, async (ctx) => {
    const {
        auction_id,
        proposal_id,
        url,
        timestamp,
        quantity,
        group_id,
        operation,
    } = ctx.request.body;

    if (!auction_id || !timestamp || !quantity || !group_id || !operation) {
        ctx.throw(400, "Request Body Incompleto");
    }

    // ------------------------------------------
    // ADMIN: OPERATION = "offer"
    // ------------------------------------------
    if (operation === "offer") {
        if (group_id === 4) {
            const existingOffer = await Auction.findOne({
                where: {
                    url,
                    group_id: 4,
                    operation: "offer",
                },
            });

            if (existingOffer) {
                ctx.throw(400, `Ya existe una oferta con el mismo URL y group_id == 4 (auction_id: ${existingOffer.auction_id})`);
            }
        }

        const [newOffer, created] = await Auction.findOrCreate({
            where: { auction_id },
            defaults: {
                proposal_id: proposal_id || null,
                url,
                timestamp,
                quantity,
                group_id,
                operation,
            }
        });

        if (!created) {
            ctx.throw(409, "Ya existe una subasta con ese auction_id");
        }

        ctx.status = 201;
        ctx.body = {
            message: "Offer registrada correctamente (admin)",
            auction_id: newOffer.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // ADMIN: OPERATION = "proposal"
    // ------------------------------------------
    if (operation === "proposal") {
        const offer = await Auction.findOne({
            where: {
                auction_id,
                operation: "offer",
            },
        });

        if (!offer) {
            ctx.throw(400, "No existe un offer previo con ese auction_id");
        }

        if (offer.group_id !== 4) {
            ctx.throw(400, "El offer previo no tiene group_id == 4");
        }

        const [newProposal, created] = await Auction.findOrCreate({
            where: { auction_id },
            defaults: {
                proposal_id: proposal_id || null,
                url,
                timestamp,
                quantity,
                group_id,
                operation,
            }
        });

        if (!created) {
            ctx.throw(409, "Ya existe un proposal con ese auction_id");
        }

        ctx.status = 201;
        ctx.body = {
            message: "Proposal registrada correctamente (admin)",
            auction_id: newProposal.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // ADMIN: OPERATION = "acceptance"
    // ------------------------------------------
    if (operation === "acceptance") {
        
        // 1. Crear aceptación (o fallar si ya existe)
        const [newAcceptance, created] = await Auction.findOrCreate({
            where: { auction_id },
            defaults: {
                proposal_id,
                url,
                timestamp,
                quantity,
                group_id,
                operation,
            }
        });

        if (!created) {
            ctx.throw(409, "Ya existe una aceptación para este auction_id");
        }

        // 2. Buscar y eliminar offer previo
        const offer = await Auction.findOne({
            where: {
                auction_id,
                operation: "offer",
            },
        });

        if (offer) {
            await offer.destroy();
        }

        // 3. Validar proposal (informativo para admin)
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        if (!proposal) {
            // Aquí en admin sí podemos ser estrictos si quisiéramos, pero
            // mantenemos consistencia con no bloquear la creación
            console.warn("⚠️ Admin creó Acceptance pero no se encontró proposal group_id 4");
        }

        ctx.status = 201;
        ctx.body = {
            message: "Acceptance registrado correctamente (admin)",
            auction_id: newAcceptance.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // ADMIN: OPERATION = "rejection"
    // ------------------------------------------
    if (operation === "rejection") {
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        let wasDeleted = false;
        if (proposal) {
            await proposal.destroy();
            wasDeleted = true;
        }

        ctx.status = 200;
        ctx.body = {
            message: "Proposal rechazado y eliminado correctamente (admin)",
            deleted: wasDeleted,
        };
        return;
    }

    ctx.throw(400, "Operación no permitida");
});

// PATCH /auctions/:auction_id
router.patch("/:auction_id", async (ctx) => {
    const { auction_id } = ctx.params;

    if (!auction_id) {
        ctx.throw(400, "Falta auction_id");
    }

    const auction = await Auction.findOne({ where: { auction_id } });

    if (!auction) {
        ctx.throw(404, "Auction not Found");
    }

    auction.published = true;
    await auction.save();

    ctx.status = 200;
    ctx.body = {
        message: "Auction publicada correctamente",
        auction_id: auction.auction_id,
    };
});

// DELETE /auctions/admin/:auction_id
router.delete("/admin/:auction_id", requireAdmin, async (ctx) => {
    const { auction_id } = ctx.params;

    if (!auction_id) {
        ctx.throw(400, "Falta auction_id");
    }

    const auction = await Auction.findOne({
        where: {
            auction_id,
            group_id: 4,
            operation: "offer"
        }
    });

    if (!auction) {
        ctx.throw(404, "Oferta no encontrada o no pertenece al grupo 4");
    }

    await auction.destroy();

    ctx.status = 200;
    ctx.body = {
        message: "Oferta eliminada correctamente",
        auction_id: auction.auction_id,
    };
});

module.exports = router;