const { v4: uuidv4 } = require("uuid");
const { Property, GroupAppointment } = require("../models");
const appointmentService = require("./appointmentService");

async function initiateGroupBuy(userId, propertyId, quantity) {
  if (!propertyId) throw { status: 400, message: "Id Propiedad faltante" };
  if (!quantity || quantity < 1) throw { status: 400, message: "Cantidad debe ser al menos 1" };

  const property = await Property.findByPk(propertyId);
  if (!property) throw { status: 404, message: "Propiedad no encontrada" };

  const finalPricePerUnit = await appointmentService.calculateFinalPrice(property);
  const totalCost = Math.floor(finalPricePerUnit * 0.1 * quantity);

  const tempRequestId = uuidv4();

  const sessionId = `QTY${Number(quantity)}_PROP${propertyId}`;

  const redirectUrl = (process.env.REDIRECT_URL || "http://localhost:5173/completed-purchase") + "?group=true";
  const trx = await appointmentService.createWebpayTransaction(
    tempRequestId,
    totalCost,
    redirectUrl,
    sessionId
  );

  return {
    group_appointment_id: tempRequestId,
    request_ids: [tempRequestId],
    quantity: quantity,
    total_cost: totalCost,
    deposit_token: trx.token,
    url: trx.url,
  };
}

async function validateGroupBuy(wsToken) {
  if (!wsToken) throw { status: 400, message: "Token faltante" };

  const confirmedTx = await appointmentService.confirmTransactionOnly(wsToken);

  const sessionIdRaw = confirmedTx.session_id || confirmedTx.sessionId;
  
  let quantity = 1;
  let propertyId = null;

  try {
    const match = sessionIdRaw.match(/QTY(\d+)_PROP(\d+)/);
    if (match) {
      quantity = Number(match[1]);
      propertyId = match[2];
    } else {
      const metadata = JSON.parse(sessionIdRaw);
      quantity = Number(metadata.q) || 1;
      propertyId = metadata.p;
    }
  } catch (e) {
    console.log("Error parsing session ID:", e.message);
  }

  if (!propertyId) {
    throw { status: 400, message: "Metadata inválida en transacción (property_id missing)" };
  }

  if (confirmedTx.response_code !== 0) {
    return {
      status: "REJECTED",
      message: "Transacción rechazada por Webpay",
      group_appointment_id: confirmedTx.buy_order,
    };
  }

  const property = await Property.findByPk(propertyId);
  if (!property) throw { status: 404, message: "Propiedad no encontrada" };

  let groupAppointment = await GroupAppointment.findOne({
    where: { property_id: property.id },
  });

  if (groupAppointment) {
    groupAppointment.quantity += quantity;
    await groupAppointment.save();
  } else {
    groupAppointment = await GroupAppointment.create({
      id: uuidv4(),
      property_id: property.id,
      quantity: quantity,
      price: Math.floor(confirmedTx.amount / quantity),
      discount: 0,
    });
  }

  if (property.reservations >= quantity) {
    property.reservations -= quantity;
    await property.save();
  }

  return {
    status: "ACCEPTED",
    message: "Transacción aceptada y compra grupal confirmada",
    group_appointment_id: groupAppointment.id,
    quantity: groupAppointment.quantity,
    property: property.url,
    pdf_url: null,
    total_amount: confirmedTx.amount,
    transaction_date: confirmedTx.transaction_date,
  };
}

module.exports = {
  initiateGroupBuy,
  validateGroupBuy,
};
