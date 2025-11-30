const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware");
const { auction } = require("../models");
const router = new Router();

router.get("/", async (ctx) => {
    const auctions = await auction.findAll({
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

router.post("/", requireAdmin, async (ctx) => {
    const {
        auction_id,
        proposal_id,
        url,
        timestamp,
        quantity,
        group_id,
        operation,
    } = ctx.request.body;

    if (
        !auction_id ||
        !timestamp ||
        !quantity ||
        !group_id ||
        !operation
    ) {
        ctx.throw(400, "Request Body Incompleto");
    }

    // Nueva validación
    if (operation !== "offer") {
        ctx.throw(400, "Solo se permiten operaciones de tipo 'offer'");
    }

    await auction.create({
        auction_id,
        proposal_id,
        url,
        timestamp,
        quantity,
        group_id,
        operation,
    });

    ctx.body = {
        message: "Subasta Creada",
        auction_id,
    };
    ctx.status = 201;
});

module.exports = router;