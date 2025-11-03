const Router = require("@koa/router");
const router = new Router();
const { Property } = require("../models");

router.get("/:property_id", async (ctx) => {
  const { property_id } = ctx.params;
  console.log(`WORKERS URL = ${process.env.WORKERS_URL}`);

  try {
    const property = await Property.findByPk(property_id);

    if (!property) {
      ctx.status = 404;
      ctx.body = { error: "Property not found" };
      return;
    }

    // Ajustamos el payload al formato que espera el JobService
    const propertyToSend = {
      id: property.id,
      name: property.name,
      beedrooms: property.bedrooms,
      price: property.price,
    };

    // POST al JobService para crear el job
    console.log(`📤 Creando job para propiedad ${property_id}...`);
    const response = await fetch(`${process.env.WORKERS_URL}/job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property: propertyToSend }),
    });

    if (!response.ok) {
      ctx.throw(500, `Error al crear job: ${response.statusText}`);
    }

    const { job_id } = await response.json();

    if (!job_id) {
      ctx.throw(500, "No se recibió job_id del servicio externo");
    }

    console.log(`✅ Job creado: ${job_id}`);

    // Polling: esperar a que el job termine
    const maxAttempts = 30; // 30 segundos máximo
    const pollInterval = 1000; // 1 segundo entre intentos
    let attempts = 0;
    let jobResult;

    console.log(`⏳ Esperando a que el job ${job_id} termine...`);

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `${process.env.WORKERS_URL}/job/${job_id}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!statusResponse.ok) {
        console.error(`❌ Error al consultar job: ${statusResponse.statusText}`);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        attempts++;
        continue;
      }

      jobResult = await statusResponse.json();

      if (jobResult.status === "SUCCESS") {
        console.log(`✅ Job ${job_id} completado exitosamente`);
        break;
      }

      if (jobResult.status === "FAILED" || jobResult.status === "ERROR") {
        console.error(`❌ Job ${job_id} falló con status: ${jobResult.status}`);
        ctx.throw(500, `El job falló: ${jobResult.status}`);
      }

      // Job aún en proceso, esperar antes de reintentar
      console.log(`⏳ Intento ${attempts + 1}/${maxAttempts} - Status: ${jobResult.status || "PENDING"}`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    // Verificar si se agotó el tiempo
    if (attempts >= maxAttempts && jobResult?.status !== "SUCCESS") {
      console.error(`⏱️ Timeout esperando job ${job_id}`);
      ctx.throw(504, "Timeout esperando recomendaciones del servicio");
    }

    // Devolver el resultado completo
    ctx.status = 200;
    ctx.body = jobResult;
  } catch (error) {
    console.error("❌ Error al obtener recomendaciones:", error);
    ctx.status = error.status || 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
