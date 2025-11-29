const Router = require("@koa/router");
const router = new Router();
const { Op } = require("sequelize");
const { Appointment } = require("../models");
const { Wallet } = require("../models");
const { Property } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { tx } = require("../utils/trx");
const transporter = require("../utils/transporter");

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
  console.log("=== /buywebpay called ===");
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

    // Check for existing appointment
    const existing = await Appointment.findOne({
      where: {
        user_id: userId,
        property_url,
        status: { [Op.in]: ["PENDING"] },
      },
    });

    if (existing) {
      existing.destroy();
      console.log(
        "Existing appointment found and deleted:",
        existing.request_id
      );
    }

    let finalPrice = property.price;

    if (property.currency === "UF") {
      let ufValue;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const ufResponse = await fetch("https://mindicador.cl/api/uf", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const ufData = await ufResponse.json();
        if (!ufData.serie?.length) throw new Error("No UF data");
        ufValue = parseFloat(ufData.serie[0].valor);
      } catch (err) {
        console.error("Error fetching UF:", err);
        const UF_DEFAULT = 39500;
        console.warn(`Usando UF por defecto: ${UF_DEFAULT}`);
        ufValue = UF_DEFAULT;
      }

      finalPrice = property.price * ufValue;
    }

    const cost = Math.floor(finalPrice * 0.1);

    // Create appointment
    const request_id = uuidv4();
    const newAppointment = await Appointment.create({
      request_id,
      user_id: userId,
      group_id: "04",
      property_url,
      status: "PENDING",
      reason: "APPOINTMENT",
    });

    const buyOrder = request_id.slice(0, 26);

    // Create transaction
    let trx;
    try {
      trx = await tx.create(
        buyOrder,
        "test-iic2173",
        cost,
        process.env.REDIRECT_URL || "http://localhost:5173/completed-purchase"
      );
    } catch (err) {
      console.error("Error creating WebPay transaction:", err);
      ctx.throw(500, "Fallo al crear transacción Webpay");
    }

    await Appointment.update(
      { deposit_token: trx.token },
      { where: { request_id: newAppointment.request_id } }
    );

    // Response
    ctx.status = 201;
    ctx.body = {
      request_id,
      status: "PENDING",
      deposit_token: trx.token,
      url: trx.url,
    };

    console.log("BuyWebpay response sent:", ctx.body);
  } catch (err) {
    console.error("Error in /buywebpay:", err);
    // Aseguramos JSON en cualquier error
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

  // Confirmar transacción en Webpay
  const confirmedTx = await tx.commit(ws_token);

  // Buscar la cita asociada a este token
  const appointment = await Appointment.findOne({
    where: { deposit_token: ws_token },
  });

  if (!appointment) {
    ctx.throw(404, "Cita no encontrada para el token proporcionado");
  }

  if (confirmedTx.response_code != 0) {
    // Transacción rechazada
    appointment.status = "REJECTED";
    appointment.reason = "Pago rechazado por Webpay";
    await appointment.save();

    ctx.body = {
      message: "Transacción rechazada",
      request_id: appointment.request_id,
      property: appointment.property_url,
    };
    ctx.status = 200;
    return;
  }

  // Transacción aprobada
  appointment.status = "ACCEPTED";
  appointment.reason = "Pago confirmado por Webpay";
  await appointment.save();

  const property = await Property.findOne({
    where: { url: { [Op.iLike]: `%${appointment.property_url}%` } },
  });

  // enviar correo
  try {
    await transporter.sendMail({
      from: '"G4 Market" <no-reply@g4market.tech>',
      to: ctx.state.user.userEmail,
      subject: `Confirmación de pago - ${appointment.request_id}`,
      text: `Hola ${ctx.state.user.fullName}, tu pago por la propiedad ${property.name} ha sido confirmado. 
Monto: ${confirmedTx.amount} ${property.currency}
Fecha: ${confirmedTx.transaction_date}
Request ID: ${appointment.request_id}`,
      html: `<p>Hola <strong>${ctx.state.user.fullName}</strong>, tu pago por la propiedad <strong>${property.name}</strong> ha sido confirmado.</p>
<p><strong>Monto:</strong> ${confirmedTx.amount} ${property.currency}</p>
<p><strong>Fecha:</strong> ${confirmedTx.transaction_date}</p>
<p><strong>Request ID:</strong> ${appointment.request_id}</p>`,
    });
    console.log("Correo de confirmación enviado a", ctx.state.user.userEmail);
  } catch (err) {
    console.error("Error enviando correo:", err);
  }

  const pdfResponse = await fetch(process.env.PDF_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Detalles transacción
      request_id: appointment.request_id,
      transaction_date: confirmedTx.transaction_date,
      amount: confirmedTx.amount,
      // Usuario
      user_id: appointment.user_id,
      user_email: ctx.state.user.userEmail,
      user_full_name: ctx.state.user.fullName,
      user_phone_number: ctx.state.user.phoneNumber,
      // Detalles propiedad
      property_name: property.name,
      property_price: property.price,
      property_currency: property.currency,
      property_bedrooms: property.bedrooms,
      property_bathrooms: property.bathrooms,
      property_m2: property.m2,
      property_location: property.location,
      property_url: appointment.property_url,
    }),
  });

  const pdfUrl = await pdfResponse.json();

  // Actualizar propiedad (descontar reserva)
  if (property && property.reservations > 0) {
    property.reservations -= 1;
    await property.save();
  }

  ctx.status = 200;
  ctx.body = {
    message: "Transacción aceptada y cita confirmada",
    request_id: appointment.request_id,
    property: appointment.property_url,
    pdf_url: pdfUrl.url,
  };

  console.log("ValidateWebpay response sent:", ctx.body);
});


router.post("/group/buy", async (ctx) => {
  ctx.body = {
    message: `Endpoint para comprar agendamientos disponibles para el grupo, disponible para usuario`,
  };
});

module.exports = router;
