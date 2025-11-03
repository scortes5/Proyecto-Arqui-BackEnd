const Router = require("@koa/router");
const router = new Router();
const { Property } = require("../models");

router.get("/:property_id", async (ctx) => {
  const { property_id } = ctx.params;

  try {
    const property = await Property.findByPk(property_id);

    if (!property) {
      ctx.status = 404;
      ctx.body = { error: "Property not found" };
      return;
    }

    // 👇 Ajustamos el payload al formato que espera el JobService
    const propertyToSend = {
      id: property.id,
      name: property.name, // ✅ este campo sí lo reconoce el servicio
      beedrooms: property.bedrooms,
      price: property.price,
    };

    // POST al JobService
    const response = await fetch(`${process.env.WORKERS_URL}/job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property: propertyToSend }),
    });

    const { job_id } = await response.json();

    if (!job_id) {
      ctx.throw(500, "No se recibió job_id del servicio externo");
    }

    // GET del resultado
    const suggestionsResponse = await fetch(
      `${process.env.WORKERS_URL}/job/${job_id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const suggestionsData = await suggestionsResponse.json();

    // 👇 devolvemos el JSON completo, sin tocarlo
    ctx.status = 200;
    ctx.body = suggestionsData;
  } catch (error) {
    console.error("❌ Error al obtener recomendaciones:", error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
