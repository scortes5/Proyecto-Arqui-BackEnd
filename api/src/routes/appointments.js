const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Appointment } = require('../models');
const { Wallet } = require("../models");
const { Property } = require("../models");
const { v4: uuidv4 } = require("uuid");

// POST /appointments/buy
router.post("/buy", async (ctx) => {
  const { user_id, property_id } = ctx.request.body;

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

  await fetch(`${process.env.BROKER_URL}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id,
      group_id: "04",
      timestamp,
      url: property_url,
      origin: 0,
      operation: "BUY"
    })
  });

  ctx.body = { request_id, status: "PENDING" };
  ctx.status = 201;

});

// GET /appointments
router.get("/", async (ctx) => {
  const { user_id } = ctx.request.body;

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

// GET /appointments/status/id
router.get("/status/:request_id", async (ctx) => {
  const { request_id } = ctx.params;
  const { user_id } = ctx.request.body;

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


