const { Op } = require("sequelize");
const { Appointment } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { tx } = require("../utils/trx");
const transporter = require("../utils/transporter");

/**
 * Obtiene el valor de la UF desde mindicador.cl
 * @returns {Promise<number>} Valor de la UF
 */
async function getUFValue() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const ufResponse = await fetch("https://mindicador.cl/api/uf", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const ufData = await ufResponse.json();
    if (!ufData.serie?.length) throw new Error("No UF data");
    return parseFloat(ufData.serie[0].valor);
  } catch (err) {
    console.error("Error fetching UF:", err);
    const UF_DEFAULT = 39500;
    console.warn(`Usando UF por defecto: ${UF_DEFAULT}`);
    return UF_DEFAULT;
  }
}

/**
 * Calcula el precio final de una propiedad (convierte UF a CLP si es necesario)
 * @param {Object} property - Objeto de propiedad
 * @returns {Promise<number>} Precio final en CLP
 */
async function calculateFinalPrice(property) {
  let finalPrice = property.price;

  if (property.currency === "UF") {
    const ufValue = await getUFValue();
    finalPrice = property.price * ufValue;
  }

  return finalPrice;
}

/**
 * Elimina appointments pendientes existentes para un usuario y propiedad
 * @param {string} userId - ID del usuario
 * @param {string} propertyUrl - URL de la propiedad
 */
async function deletePendingAppointments(userId, propertyUrl) {
  const existing = await Appointment.findOne({
    where: {
      user_id: userId,
      property_url: propertyUrl,
      status: { [Op.in]: ["PENDING"] },
    },
  });

  if (existing) {
    await existing.destroy();
    console.log("Existing appointment found and deleted:", existing.request_id);
  }
}

/**
 * Crea un nuevo appointment
 * @param {string} userId - ID del usuario
 * @param {string} propertyUrl - URL de la propiedad
 * @param {string} groupId - ID del grupo (por defecto "04")
 * @returns {Promise<Object>} Appointment creado
 */
async function createAppointment(userId, propertyUrl, groupId = "04") {
  const request_id = uuidv4();
  const newAppointment = await Appointment.create({
    request_id,
    user_id: userId,
    group_id: groupId,
    property_url: propertyUrl,
    status: "PENDING",
    reason: "APPOINTMENT",
  });

  return newAppointment;
}

/**
 * Crea una transacción de Webpay
 * @param {string} requestId - ID de la solicitud
 * @param {number} cost - Costo de la transacción
 * @param {string} redirectUrl - URL de redirección
 * @returns {Promise<Object>} Objeto de transacción con token y url
 */
async function createWebpayTransaction(requestId, cost, redirectUrl, sessionId = "test-iic2173") {
  const buyOrder = requestId.slice(0, 26);

  try {
    const trx = await tx.create(buyOrder, sessionId, cost, redirectUrl);
    return trx;
  } catch (err) {
    console.error("Error creating WebPay transaction:", err);
    throw new Error("Fallo al crear transacción Webpay");
  }
}

/**
 * Actualiza el deposit_token de un appointment
 * @param {string} requestId - ID de la solicitud
 * @param {string} depositToken - Token de depósito
 */
async function updateAppointmentToken(requestId, depositToken) {
  await Appointment.update(
    { deposit_token: depositToken },
    { where: { request_id: requestId } }
  );
}

/**
 * Confirma una transacción de Webpay y actualiza el appointment
 * @param {string} wsToken - Token de Webpay
 * @returns {Promise<Object>} Objeto con appointment y transacción confirmada
 */
async function confirmWebpayTransaction(wsToken) {
  // Confirmar transacción en Webpay
  const confirmedTx = await tx.commit(wsToken);

  // Buscar la cita asociada a este token
  const appointment = await Appointment.findOne({
    where: { deposit_token: wsToken },
  });

  if (!appointment) {
    throw new Error("Cita no encontrada para el token proporcionado");
  }

  return { appointment, confirmedTx };
}

/**
 * Confirma una transacción de Webpay SIN buscar appointment (para compras grupales)
 * @param {string} wsToken - Token de Webpay
 * @returns {Promise<Object>} Transacción confirmada
 */
async function confirmTransactionOnly(wsToken) {
  const confirmedTx = await tx.commit(wsToken);
  return confirmedTx;
}

/**
 * Procesa el resultado de una transacción (aprobada o rechazada)
 * @param {Object} appointment - Appointment a actualizar
 * @param {Object} confirmedTx - Transacción confirmada
 * @returns {Promise<boolean>} true si fue aprobada, false si fue rechazada
 */
async function processTransactionResult(appointment, confirmedTx) {
  if (confirmedTx.response_code != 0) {
    // Transacción rechazada
    appointment.status = "REJECTED";
    appointment.reason = "Pago rechazado por Webpay";
    await appointment.save();
    return false;
  }

  // Transacción aprobada
  appointment.status = "ACCEPTED";
  appointment.reason = "Pago confirmado por Webpay";
  await appointment.save();
  return true;
}

/**
 * Envía correo de confirmación de pago
 * @param {string} userEmail - Email del usuario
 * @param {string} fullName - Nombre completo del usuario
 * @param {Object} property - Objeto de propiedad
 * @param {Object} appointment - Objeto de appointment
 * @param {Object} confirmedTx - Transacción confirmada
 */
async function sendConfirmationEmail(
  userEmail,
  fullName,
  property,
  appointment,
  confirmedTx
) {
  try {
    await transporter.sendMail({
      from: '"G4 Market" <no-reply@g4market.tech>',
      to: userEmail,
      subject: `Confirmación de pago - ${appointment.request_id}`,
      text: `Hola ${fullName}, tu pago por la propiedad ${property.name} ha sido confirmado. 
Monto: ${confirmedTx.amount} ${property.currency}
Fecha: ${confirmedTx.transaction_date}
Request ID: ${appointment.request_id}`,
      html: `<p>Hola <strong>${fullName}</strong>, tu pago por la propiedad <strong>${property.name}</strong> ha sido confirmado.</p>
<p><strong>Monto:</strong> ${confirmedTx.amount} ${property.currency}</p>
<p><strong>Fecha:</strong> ${confirmedTx.transaction_date}</p>
<p><strong>Request ID:</strong> ${appointment.request_id}</p>`,
    });
    console.log("Correo de confirmación enviado a", userEmail);
  } catch (err) {
    console.error("Error enviando correo:", err);
  }
}

/**
 * Genera PDF de confirmación
 * @param {Object} appointment - Appointment
 * @param {Object} confirmedTx - Transacción confirmada
 * @param {Object} user - Datos del usuario
 * @param {Object} property - Datos de la propiedad
 * @returns {Promise<string>} URL del PDF generado
 */
async function generateConfirmationPDF(
  appointment,
  confirmedTx,
  user,
  property
) {
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
      user_email: user.userEmail,
      user_full_name: user.fullName,
      user_phone_number: user.phoneNumber,
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
  return pdfUrl.url;
}

/**
 * Actualiza las reservaciones de una propiedad (decrementa en 1)
 * @param {Object} property - Propiedad a actualizar
 */
async function decrementPropertyReservations(property) {
  if (property && property.reservations > 0) {
    property.reservations -= 1;
    await property.save();
  }
}

module.exports = {
  getUFValue,
  calculateFinalPrice,
  deletePendingAppointments,
  createAppointment,
  createWebpayTransaction,
  updateAppointmentToken,
  confirmWebpayTransaction,
  confirmTransactionOnly,
  processTransactionResult,
  sendConfirmationEmail,
  generateConfirmationPDF,
  decrementPropertyReservations,
};
