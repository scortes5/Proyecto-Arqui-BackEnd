const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware");
const { Auction } = require("../models");
const router = new Router();

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

    if (!auction_id || !timestamp || !quantity || !group_id || !operation) {
        ctx.throw(400, "Request Body Incompleto");
    }

    // ------------------------------------------
    // OPERATION = "offer"
    // ------------------------------------------
    if (operation === "offer") {
        const newOffer = await Auction.create({
            auction_id,
            proposal_id: proposal_id || null,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Offer registrada correctamente",
            auction_id: newOffer.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // OPERATION = "proposal"
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

        const newProposal = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Proposal registrada correctamente",
            auction_id: newProposal.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // OPERATION = "acceptance"
    // ------------------------------------------
    if (operation === "acceptance") {

        // Buscar y eliminar offer previo
        const offer = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "offer",
            },
        });

        if (offer) {
            await offer.destroy();
        }

        // Buscar proposal válido
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        if (!proposal) {
            ctx.throw(400, "No existe un proposal válido (group_id == 4) para aceptar");
        }

        const newAcceptance = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Acceptance registrado correctamente",
            auction_id: newAcceptance.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // OPERATION = "rejection"
    // ------------------------------------------
    if (operation === "rejection") {

        // Buscar proposal con group_id == 4
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        // Si existe → eliminarlo
        if (proposal) {
            await proposal.destroy();
        }

        ctx.status = 200;
        ctx.body = {
            message: "Proposal rechazado y eliminado correctamente",
            deleted: Boolean(proposal),
        };
        return;
    }

    // ------------------------------------------
    // Operación no válida
    // ------------------------------------------
    ctx.throw(400, "Operación no permitida");
});

// Endpoint POST para admin - misma lógica que POST / pero requiere admin
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
    // OPERATION = "offer"
    // ------------------------------------------
    if (operation === "offer") {
        // Validar que no exista otra oferta con el mismo URL y group_id == 4
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

        const newOffer = await Auction.create({
            auction_id,
            proposal_id: proposal_id || null,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Offer registrada correctamente (admin)",
            auction_id: newOffer.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // OPERATION = "proposal"
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

        const newProposal = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Proposal registrada correctamente (admin)",
            auction_id: newProposal.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // OPERATION = "acceptance"
    // ------------------------------------------
    if (operation === "acceptance") {

        // Buscar y eliminar offer previo
        const offer = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "offer",
            },
        });

        if (offer) {
            await offer.destroy();
        }

        // Buscar proposal válido
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        if (!proposal) {
            ctx.throw(400, "No existe un proposal válido (group_id == 4) para aceptar");
        }

        const newAcceptance = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Acceptance registrado correctamente (admin)",
            auction_id: newAcceptance.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // OPERATION = "rejection"
    // ------------------------------------------
    if (operation === "rejection") {

        // Buscar proposal con group_id == 4
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        // Si existe → eliminarlo
        if (proposal) {
            await proposal.destroy();
        }

        ctx.status = 200;
        ctx.body = {
            message: "Proposal rechazado y eliminado correctamente (admin)",
            deleted: Boolean(proposal),
        };
        return;
    }

    // ------------------------------------------
    // Operación no válida
    // ------------------------------------------
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


module.exports = router;
