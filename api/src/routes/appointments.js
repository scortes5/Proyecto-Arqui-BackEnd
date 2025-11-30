const Router = require("@koa/router");
const router = new Router();
const { Op } = require("sequelize");
const { Appointment } = require("../models");
const { Wallet } = require("../models");
const { Property } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { tx } = require("../utils/trx");
const transporter = require("../utils/transporter");
const appointmentService = require("../services/appointmentService");

// POST /appointments/buy (borrado)

// POST /appointments/validate
router.post("/validate", async (ctx) => {
  const { request_id, deposit_token, status, reason, timestamp } =
    ctx.request.body;

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

  // const property = await Property.findOne({ where: { url: appointment.property_url } });

  // Actualizar estado
  appointment.status = status;
  appointment.deposit_token = deposit_token;
  appointment.reason = reason || "-";
  await appointment.save();

  ctx.body = {
    message: "Visita Actualizada",
    request_id,
    new_status: status,
  };
  ctx.status = 200;
});

// POST /appointments/requests
router.post("/requests", async (ctx) => {
  const { request_id, deposit_token, group_id, url, timestamp } =
    ctx.request.body;

  if (!request_id || !group_id || !timestamp || !url) {
    ctx.throw(400, "Request Body Incompleto");
  }

  const appointment = await Appointment.findOne({ where: { request_id } });

  if (!appointment) {
    await Appointment.create({
      request_id,
      deposit_token,
      group_id,
      property_url: url,
      status: "PENDING",
      reason: "APPOINTMENT",
    });
  }

  ctx.body = {
    message: "Reserva Creada",
    request_id,
  };

  ctx.status = 200;
});

// GET /appointments
router.get("/", async (ctx) => {
  const { userId } = ctx.state.user;

  const appointments = await Appointment.findAll({
    where: { user_id: userId },
    order: [["createdAt", "DESC"]],
  });

  ctx.body = appointments.map((a) => ({
    request_id: a.request_id,
    property_url: a.property_url,
    status: a.status,
    reason: a.reason,
    created_at: a.createdAt,
  }));
  ctx.status = 200;
});

// GET /appointments/all
router.get("/all", async (ctx) => {
  const appointments = await Appointment.findAll({
    order: [["createdAt", "DESC"]],
  });

  ctx.body = appointments.map((a) => ({
    request_id: a.request_id,
    deposit_token: a.deposit_token,
    user_id: a.user_id,
    group_id: a.group_id,
    property_url: a.property_url,
    validation_published: a.validation_published,
    status: a.status,
    reason: a.reason,
    created_at: a.createdAt,
    updated_at: a.updatedAt,       
  }));

  ctx.status = 200;
});

// GET /appointments/status/id
router.get("/status/:request_id", async (ctx) => {
  const { request_id } = ctx.params;
  const { userId } = ctx.state.user;

  const appointment = await Appointment.findOne({
    where: { request_id, user_id: userId },
  });

  if (!appointment) {
    ctx.throw(404, "Visita no encontrada");
  }

  ctx.body = {
    request_id: appointment.request_id,
    status: appointment.status,
    reason: appointment.reason,
  };
  ctx.status = 200;
});

// PATCH /appointments/:request_id
router.patch("/:request_id", async (ctx) => {
  const { request_id } = ctx.params;

  if (!request_id) {
    ctx.throw(400, "Falta request_id");
  }

  const appointment = await Appointment.findOne({ where: { request_id } });

  if (!appointment) {
    ctx.throw(404, "Appointment not Found");
  }

  appointment.validation_published = true;
  await appointment.save();

  ctx.status = 200;
  ctx.body = {
    message: "Cita marcada como publicada",
    request_id: appointment.request_id,
  };
});

// DELETE /appointments/:request_id
router.delete("/:request_id", async (ctx) => {
  const { request_id } = ctx.params;

  if (!request_id) {
    ctx.throw(400, "Falta request_id");
  }

  const appointment = await Appointment.findOne({ where: { request_id } });

  if (!appointment) {
    ctx.throw(404, "Appointment not Found");
  }

  await appointment.destroy();

  ctx.status = 200;
  ctx.body = {
    message: "Appointment Deleted",
  };
});

///////////////Rutas webpay//////////////////////
// POST /appointments/buywebpay

router.post("/buy", async (ctx) => {
  console.log("=== /buy called ===");
  console.log("Headers:", ctx.request.headers);
  console.log("Body:", ctx.request.body);
  console.log("ctx.state.user:", ctx.state.user);

  try {
    const { userId } = ctx.state.user;
    const { property_id } = ctx.request.body;

    if (!property_id) ctx.throw(400, "Id Propiedad faltante");
    if (!userId) ctx.throw(400, "Id Usuario faltante");

    // Fetch property
    const property = await Property.findByPk(property_id);
    if (!property) ctx.throw(404, "Propiedad no encontrada");
    console.log("Property fetched:", property.toJSON());

    const property_url = property.url.split("#")[0];

    // Eliminar appointments pendientes existentes
    await appointmentService.deletePendingAppointments(userId, property_url);

    // Calcular precio final
    const finalPrice = await appointmentService.calculateFinalPrice(property);
    const cost = Math.floor(finalPrice * 0.1);

    // Crear appointment
    const newAppointment = await appointmentService.createAppointment(
      userId,
      property_url,
      "04"
    );

    // Crear transacción Webpay
    const redirectUrl =
      process.env.REDIRECT_URL || "http://localhost:5173/completed-purchase";
    const trx = await appointmentService.createWebpayTransaction(
      newAppointment.request_id,
      cost,
      redirectUrl
    );

    // Actualizar token del appointment
    await appointmentService.updateAppointmentToken(
      newAppointment.request_id,
      trx.token
    );

    // Response
    ctx.status = 201;
    ctx.body = {
      request_id: newAppointment.request_id,
      status: "PENDING",
      deposit_token: trx.token,
      url: trx.url,
    };

    console.log("Buy response sent:", ctx.body);
  } catch (err) {
    console.error("Error in /buy:", err);
    ctx.status = err.status || 500;
    ctx.body = { error: err.message || "Error interno del servidor" };
  }
});

// POST /appointments/validatebuy
router.post("/validatebuy", async (ctx) => {
  const { ws_token } = ctx.request.body;

  if (!ws_token || ws_token === "") {
    ctx.body = { message: "Transacción anulada por el usuario" };
    ctx.status = 200;
    return;
  }

  try {
    // Confirmar transacción y obtener appointment
    const { appointment, confirmedTx } =
      await appointmentService.confirmWebpayTransaction(ws_token);

    // Procesar resultado de la transacción
    const isApproved = await appointmentService.processTransactionResult(
      appointment,
      confirmedTx
    );

    if (!isApproved) {
      ctx.body = {
        message: "Transacción rechazada",
        request_id: appointment.request_id,
        property: appointment.property_url,
      };
      ctx.status = 200;
      return;
    }

    // Buscar propiedad
    const property = await Property.findOne({
      where: { url: { [Op.iLike]: `%${appointment.property_url}%` } },
    });

    // Enviar correo de confirmación
    await appointmentService.sendConfirmationEmail(
      ctx.state.user.userEmail,
      ctx.state.user.fullName,
      property,
      appointment,
      confirmedTx
    );

    // Generar PDF
    const pdfUrl = await appointmentService.generateConfirmationPDF(
      appointment,
      confirmedTx,
      ctx.state.user,
      property
    );

    // Actualizar reservaciones de la propiedad
    await appointmentService.decrementPropertyReservations(property);

    ctx.status = 200;
    ctx.body = {
      message: "Transacción aceptada y cita confirmada",
      request_id: appointment.request_id,
      property: appointment.property_url,
      pdf_url: pdfUrl,
    };

    console.log("ValidateWebpay response sent:", ctx.body);
  } catch (err) {
    console.error("Error in /validatebuy:", err);
    ctx.status = err.status || 500;
    ctx.body = { error: err.message || "Error interno del servidor" };
  }
});


router.post("/group/buy", async (ctx) => {
  ctx.body = {
    message: `Endpoint para comprar agendamientos disponibles para el grupo, disponible para usuario`,
  };
});

module.exports = router;
