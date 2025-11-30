const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware");
const { GroupAppointment } = require("../models");
const groupAppointmentService = require("../services/groupAppointmentService");
const router = new Router();

router.get("/", async (ctx) => {
  const groupAppointments = await GroupAppointment.findAll({
    order: [["createdAt", "DESC"]],
  });

  ctx.body = groupAppointments.map((a) => ({
    id: a.id,
    property_id: a.property_id,
    quantity: a.quantity,
    discount: a.discount,
    price: a.price,
    created_at: a.createdAt,
  }));
  ctx.status = 200;
});

router.post("/buy", requireAdmin, async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const { property_id, quantity } = ctx.request.body;

    const result = await groupAppointmentService.initiateGroupBuy(
      userId,
      property_id,
      quantity
    );

    ctx.status = 201;
    ctx.body = result;
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message || "Error interno del servidor" };
  }
});

router.post("/validatebuy", requireAdmin, async (ctx) => {
  const { ws_token } = ctx.request.body;

  if (!ws_token) {
    ctx.body = { message: "Transacción anulada por el usuario" };
    ctx.status = 200;
    return;
  }

  try {
    const result = await groupAppointmentService.validateGroupBuy(ws_token);

    ctx.status = 200;
    ctx.body = result;
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message || "Error interno del servidor" };
  }
});

router.post("/:propertyId/discount", requireAdmin, async (ctx) => {
  groupAppointment = await GroupAppointment.findOne({
    where: {
      property_id: ctx.params.propertyId,
    },
  });

  if (!groupAppointment) {
    ctx.status = 404;
    ctx.body = { error: "Agendamiento no encontrado" };
    return;
  }

  const discount = ctx.request.body.discount;
  if (discount > 10) {
    ctx.status = 400;
    ctx.body = { error: "El descuento no puede ser mayor al 10%" };
    return;
  }

  groupAppointment.discount = discount;
  await groupAppointment.save();

  ctx.status = 200;
  ctx.body = groupAppointment;
});


module.exports = router;
