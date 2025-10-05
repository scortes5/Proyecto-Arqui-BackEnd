const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Appointment } = require('../models');
const { Wallet } = require("../models");
const { Property } = require("../models");
const { v4: uuidv4 } = require("uuid");

// POST /appointments/buy
router.post("/buy", async (ctx) => {
  const { userId: user_id } = ctx.state.user;
  const {property_id } = ctx.request.body;

  if (!property_id || !user_id) {
    ctx.throw(400, "Missing required fields");
  }

  const property = await Property.findByPk(property_id);
  if (!property) {
    ctx.throw(404, "Property not found");
  }

  const { price, currency, url: url } = property;
  const property_url = url.split("#")[0];


  // UF a CLP
  let finalPrice = price;
  if (currency === "UF") {
    const ufResponse = await fetch("https://mindicador.cl/api/uf");
    const ufData = await ufResponse.json();
    const ufValue = parseFloat(ufData.uf.valor);
    if (isNaN(ufValue)) ctx.throw(500, "Failed to convert UF to CLP");
    finalPrice = price * ufValue;
  }

  const cost = Math.floor(price * 0.1);

  const wallet = await Wallet.findOne({ where: { user_id } });
  if (!wallet || wallet.balance < cost) {
    ctx.throw(400, "Insufficient balance");
  }

  const existing = await Appointment.findOne({
    where: {
      user_id,
      property_url,
      status: { [Op.in]: ["PENDING", "ACCEPTED"] }
    }
  });
  if (existing) ctx.throw(409, "You already have a pending or accepted appointment for this property");

  const request_id = uuidv4();
  const timestamp = new Date().toISOString();

  await Appointment.create({
    request_id,
    user_id,
    group_id: "04",
    property_url,
    status: "PENDING",
    reason: "APPOINTMENT"
  });

  wallet.balance -= cost;
  await wallet.save();

  ctx.body = { request_id, status: "PENDING" };
  ctx.status = 201;

});

// POST /appointments
router.post("/", async (ctx) => {
  const { request_id, group_id, property_url, reason, created_at} = ctx.request.body;

  if (!request_id || !group_id || !created_at || !property_url || !reason) {
    ctx.throw(400, "Missing required fields");
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
    message: "Appointment created",
    request_id
  };

  ctx.status = 200;
});

// GET /appointments
router.get("/", async (ctx) => {
  const { userId: user_id } = ctx.state.user;

  const appointments = await Appointment.findAll({
    where: { user_id },
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
    ctx.throw(400, "Missing required fields");
  }

  const validStatuses = ["ACCEPTED", "REJECTED", "error", "OK"];
  if (!validStatuses.includes(status)) {
    ctx.throw(400, "Invalid status");
  }

  const appointment = await Appointment.findOne({ where: { request_id } });
  if (!appointment) {
    ctx.throw(404, "Appointment not found");
  }

  // Actualizar estado
  appointment.status = status;
  appointment.reason = reason || "No reason provided";
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
    message: "Appointment updated",
    request_id,
    new_status: status
  };
  ctx.status = 200;
});



// GET /appointments/status/id
router.get("/status/:request_id", async (ctx) => {
  const { request_id } = ctx.params;
  const { userId: user_id } = ctx.state.user;

  const appointment = await Appointment.findOne({
    where: { request_id, user_id }
  });

  if (!appointment) {
    ctx.throw(404, "Appointment not found");
  }

  ctx.body = {
    request_id: appointment.request_id,
    status: appointment.status,
    reason: appointment.reason
  };
  ctx.status = 200;
});


module.exports = router;


