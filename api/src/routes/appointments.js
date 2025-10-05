const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Appointment } = require('../models');
const { Wallet } = require("../models");
const { Property } = require("../models");
const { v4: uuidv4 } = require("uuid");

// POST /appointments/buy
router.post("/buy", async (ctx) => {
  const { userId } = ctx.state.user;
  const {property_id } = ctx.request.body;

  if (!property_id) {
    ctx.throw(400, "Id Propiedad faltante");
  }

  if (!userId) {
    ctx.throw(400, "Id Usuario faltante");
  }

  const property = await Property.findByPk(property_id);
  if (!property) {
    ctx.throw(404, "Propiedad no Encontrada");
  }

  if (property.reservations < 1) {
    ctx.throw(409, "No existen Reservas disponibles para la propiedad");
  }

  const { price, currency, url: url } = property;
  const property_url = url.split("#")[0];

  // UF a CLP
  let finalPrice = price;
  if (currency === "UF") {
    const ufResponse = await fetch("https://mindicador.cl/api/uf");
    const ufData = await ufResponse.json();

    if (!ufData.serie?.length) {
      ctx.throw(500, "Fallo conversión UF: sin datos válidos desde mindicador.cl");
    }

    const ufValue = parseFloat(ufData.serie[0].valor);
    if (isNaN(ufValue)) ctx.throw(500, "Fallo conversión UF a CLP");

    finalPrice = price * ufValue;
  }

  const cost = Math.floor(price * 0.1);

  const wallet = await Wallet.findOne({ where: { user_id: userId } });
  if (!wallet || wallet.balance < cost) {
    ctx.throw(402, "Dinero Insuficiente");
  }

  const existing = await Appointment.findOne({
    where: {
      user_id: userId,
      property_url,
      status: { [Op.in]: ["PENDING", "ACCEPTED"] }
    }
  });
  if (existing) ctx.throw(409, "Ya tienes una invitacion pendiente para esta propiedad");

  const request_id = uuidv4();
  const timestamp = new Date().toISOString();

  await Appointment.create({
    request_id,
    user_id: userId,
    group_id: "04",
    property_url,
    status: "PENDING",
    reason: "APPOINTMENT"
  });

  wallet.balance -= cost;
  property.reservations -= 1;
  await property.save();
  await wallet.save();

  ctx.body = { request_id, status: "PENDING" };
  ctx.status = 201;

});

// POST /appointments
router.post("/", async (ctx) => {
  const { request_id, group_id, property_url, reason, created_at} = ctx.request.body;

  if (!request_id || !group_id || !created_at || !property_url || !reason) {
    ctx.throw(400, "Request Body Incompleto");
  }

  const appointment = await Appointment.findOne({ where: { request_id } });
  if (!appointment) {
    await Appointment.create({
    request_id,
    group_id,
    property_url,
    status: "PENDING",
    reason
  });
  }

  ctx.body = {
    message: "Reserva Creada",
    request_id
  };

  ctx.status = 200;
});

// GET /appointments
router.get("/", async (ctx) => {
  const { userId } = ctx.state.user;

  const appointments = await Appointment.findAll({
    where: { user_id: userId },
    order: [["createdAt", "DESC"]]
  });

  ctx.body = appointments.map(a => ({
    request_id: a.request_id,
    property_url: a.property_url,
    status: a.status,
    reason: a.reason,
    created_at: a.createdAt
  }));
  ctx.status = 200;
});

// GET /appointments/all
router.get("/all", async (ctx) => {
  const appointments = await Appointment.findAll({
    order: [["createdAt", "DESC"]]
  });

  ctx.body = appointments.map(a => ({
    request_id: a.request_id,
    user_id: a.user_id,
    group_id: a.group_id,
    property_url: a.property_url,
    status: a.status,
    reason: a.reason,
    created_at: a.createdAt
  }));

  ctx.status = 200;
});

// POST /appointments/validate
router.post("/validate", async (ctx) => {
  const { request_id, status, reason, timestamp } = ctx.request.body;

  if (!request_id || !status || !timestamp) {
    ctx.throw(400, "Request Body Incompleto");
  }

  const validStatuses = ["ACCEPTED", "REJECTED", "error", "OK"];
  if (!validStatuses.includes(status)) {
    ctx.throw(400, "Status Invalido");
  }

  const appointment = await Appointment.findOne({ where: { request_id } });
  if (!appointment) {
    ctx.throw(404, "Visita no encontrada");
  }

  // Actualizar estado
  appointment.status = status;
  appointment.reason = reason || "-";
  await appointment.save();

  // Registrar evento
  // await EventLog.create({
  //   type: "VALIDATION_RECEIVED",
  //   request_id,
  //   group_id: appointment.group_id,
  //   url: appointment.property_url,
  //   status,
  //   reason,
  //   timestamp,
  //   raw_payload: JSON.stringify(ctx.request.body)
  // });

  ctx.body = {
    message: "Visita Actualizada",
    request_id,
    new_status: status
  };
  ctx.status = 200;
});

// GET /appointments/status/id
router.get("/status/:request_id", async (ctx) => {
  const { request_id } = ctx.params;
  const { userId } = ctx.state.user;

  const appointment = await Appointment.findOne({
    where: { request_id, user_id: userId }
  });

  if (!appointment) {
    ctx.throw(404, "Visita no encontrada");
  }

  ctx.body = {
    request_id: appointment.request_id,
    status: appointment.status,
    reason: appointment.reason
  };
  ctx.status = 200;
});


module.exports = router;


