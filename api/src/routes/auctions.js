const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware");
const { Auction, GroupAppointment, Property } = require("../models");
const router = new Router();
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

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
        published: a.published,
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

        // Solo nos importan proposals de ofertas propias
        if (offer.group_id !== 4) {
            ctx.status = 200;
            ctx.body = { message: "Proposal no está dirigido a oferta propia (ignorada)", auction_id };
            return;
        }

        // ✅ IMPORTANTE: crear siempre un nuevo Proposal, aunque comparta auction_id
        const newProposal = await Auction.create({
            auction_id,     // puede repetirse
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Proposal registrada",
            auction_id: newProposal.auction_id,
            id: newProposal.id, // el PK real
        };
        return;
    }


    // ------------------------------------------
    // 3. OPERATION = "acceptance"
    // ------------------------------------------
    if (operation === "acceptance") {

        // 1. Buscar la oferta original, su propiedad, cantidad y si existe groupAppointment
        const offer = await Auction.findOne({
            where: {
                auction_id,
                operation: "offer",
            },
        });

        if (!offer) {
            ctx.throw(404, `No existe una oferta con el auction_id ${auction_id}`);
        }

        const offerProperty = await Property.findOne({
            where: { url: offer.url },
        });

        if (!offerProperty) {
            ctx.throw(404, `No existe una propiedad con el URL ${offer.url}`);
        }

        const offer_property_id = offerProperty.id;

        const offer_quantity = offer.quantity;

        const offer_group_appointment = await GroupAppointment.findOne({
            where: { property_id: offer_property_id },
        });

        // 2. Buscar proposal local, su propiedad, cantidad y si existe groupAppointment
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
                group_id: 4,
            },
        });

        const proposalProperty = await Property.findOne({
            where: { url: proposal.url },
        });

        if (!proposalProperty) {
            ctx.throw(404, `No existe una propiedad con el URL ${proposal.url}`);
        }

        const proposal_property_id = proposalProperty.id;

        const proposal_quantity = proposal.quantity;

        const proposal_group_appointment = await GroupAppointment.findOne({
            where: { property_id: proposal_property_id },
        });

        // ⚠️ SI EL PROPOSAL NO ES DEL GRUPO 4
        if (!proposal) {
            ctx.status = 201;
            ctx.body = {
                message: `Proposal aceptado no es del grupo 4, ignorado`
            };
            // Se eliminan los proposals del grupo 4
            await Auction.destroy({
                where: {
                    auction_id,
                    group_id: 4,
                },
            });
            // Eliminamos la oferta original
            if (offer) {
                await offer.destroy();
            }
            return;
        }

        // 3. Crear un nuevo registro de aceptación
        const newAcceptance = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,  // "acceptance"
        });

        // 4. Si existe offer_group_appointment, le agregamos offer_quantity
        if (offer_group_appointment) {
            offer_group_appointment.quantity += offer_quantity;
            await offer_group_appointment.save();
        }

        // 5. Si no existe, lo creamos
        if (!offer_group_appointment) {
            await GroupAppointment.create({
                id: uuidv4(),
                property_id: offer_property_id,
                quantity: offer_quantity,
                discount: 0,
                price: offerProperty.price,
                created_at: new Date()
            });
        }

        // 6. Si existe proposal_group_appointment, le quitamos proposal_quantity
        if (proposal_group_appointment) {
            proposal_group_appointment.quantity -= proposal_quantity;
            await proposal_group_appointment.save();
        }

        // 7. Eliminamos la oferta original
        if (offer) {
            await offer.destroy();
        }

        // 8. Eliminamos todos los otros proposal a la oferta original no aceptados 
        await Auction.destroy({
            where: {
                auction_id,
                proposal_id: { [Op.ne]: proposal_id }, // proposal_id distinto al aceptado
                group_id: 4,
                operation: "proposal",
            },
        });

        // 9. Respuesta
        ctx.status = 201;
        ctx.body = {
            message: "Acceptance procesada correctamente",
            acceptance_id: newAcceptance.id
        };
        return;
    }


    // ------------------------------------------
    // 4. OPERATION = "rejection"
    // ------------------------------------------
    if (operation === "rejection") {
        // 1. Creamos un nuevo registro de rechazo
        const newRejection = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,  // "rejection"
        });

        // 2. Respuesta
        ctx.status = 201;
        ctx.body = {
            message: "Rejection procesada correctamente",
            rejection_id: newRejection.id
        };
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

        // Validación adicional para proposals propios (group_id == 4)
        if (group_id === 4) {

            const property = await Property.findOne({
                where: { url },
            });

            if (!property) {
                ctx.throw(404, `No existe una propiedad con el URL ${url}`);
            }

            const property_id = property.id;

            const groupAppointment = await GroupAppointment.findOne({
                where: { property_id },
            });

            if (!groupAppointment) {
                ctx.throw(404, `No se encontró GroupAppointment para property_id ${property_id}`);
            }

            // Buscar oferta existente para la misma propiedad (group_id == 4, operation == offer)
            const existingOffer = await Auction.findOne({
                where: {
                    url,
                    group_id: 4,
                    operation: "offer"
                }
            });

            const offerQuantity = existingOffer ? existingOffer.quantity : 0;
            const totalQuantity = quantity + offerQuantity;

            if (totalQuantity > groupAppointment.quantity) {
                ctx.throw(400,
                    `La cantidad total (proposal: ${quantity} + offer existente: ${offerQuantity} = ${totalQuantity}) ` +
                    `supera la cantidad disponible de la propiedad (${groupAppointment.quantity})`
                );
            }
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
            auction_id: newProposal.proposal_id,
        };
        return;
    }

    // ------------------------------------------
    // ADMIN: OPERATION = "acceptance"
    // ------------------------------------------
    if (operation === "acceptance") {
        // 1. Buscar el proposal, su propiedad, cantidad y si existe groupAppointment
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
            },
        });

        const proposalProperty = await Property.findOne({
            where: { url: proposal.url },
        });

        if (!proposalProperty) {
            ctx.throw(404, `No existe una propiedad con el URL ${proposal.url}`);
        }

        const proposal_property_id = proposalProperty.id;

        const proposal_quantity = proposal.quantity;

        const proposal_group_appointment = await GroupAppointment.findOne({
            where: { property_id: proposal_property_id },
        });

        // 2. Buscar la oferta local, su propiedad, cantidad y si existe groupAppointment
        const offer = await Auction.findOne({
            where: {
                auction_id,
                operation: "offer",
            },
        });

        const offerProperty = await Property.findOne({
            where: { url: offer.url },
        });

        if (!offerProperty) {
            ctx.throw(404, `No existe una propiedad con el URL ${offer.url}`);
        }

        const offer_property_id = offerProperty.id;

        const offer_quantity = offer.quantity;

        const offer_group_appointment = await GroupAppointment.findOne({
            where: { property_id: offer_property_id },
        });

        // 3. Crear un nuevo registro de aceptación
        const newAcceptance = await Auction.create({
            auction_id,
            proposal_id,
            url,
            timestamp,
            quantity,
            group_id,
            operation,  // "acceptance"
        });

        // 4. Si existe proposal_group_appointment, le agregamos proposal_quantity a quantity
        if (proposal_group_appointment) {
            proposal_group_appointment.quantity += proposal_quantity;
            await proposal_group_appointment.save();
        }

        // 5. Si no existe, lo creamos
        if (!proposal_group_appointment) {
            await GroupAppointment.create({
                id: uuidv4(),
                property_id: proposal_property_id,
                quantity: proposal_quantity,
                discount: 0,
                price: proposalProperty.price,
                created_at: new Date()
            });
        }

        // 6. Si existe offer_group_appointment, le quitamos offer_quantity a quantity
        if (offer_group_appointment) {
            offer_group_appointment.quantity -= offer_quantity;
            await offer_group_appointment.save();
        }

        // 7. Eliminamos la oferta original
        await offer.destroy();

        // 8. Eliminamos todos los otros proposal no aceptados
        await Auction.destroy({
            where: {
                auction_id,
                operation: "proposal",
            },
        });

        // 9. Respuesta
        ctx.status = 201;
        ctx.body = {
            message: "Acceptance procesada correctamente",
            auction_id: newAcceptance.auction_id,
        };
        return;
    }

    // ------------------------------------------
    // ADMIN: OPERATION = "rejection"
    // ------------------------------------------
    if (operation === "rejection") {
        // 1. Buscamos el proposal
        const proposal = await Auction.findOne({
            where: {
                auction_id,
                proposal_id,
                operation: "proposal",
            },
        });

        if (!proposal) {
            ctx.throw(404, `No existe una propuesta con el proposal_id ${proposal_id}`);
        }

        // 2. Eliminamos la propuesta
        await proposal.destroy();

        // 3. Respuesta
        ctx.status = 201;
        ctx.body = {
            message: "Rejection procesada correctamente"
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