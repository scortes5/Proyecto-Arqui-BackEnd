const Router = require("@koa/router");
const router = new Router();
const { Property } = require("../models");

// GET /suggestions/heartbeat - Verificar si el servicio de workers está corriendo
router.get("/heartbeat", async (ctx) => {
  try {
    const response = await fetch(`${process.env.WORKERS_URL}/heartbeat`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      ctx.status = 503;
      ctx.body = {
        status: "down",
        message: "Workers service is not responding",
      };
      return;
    }

    const data = await response.json();
    ctx.status = 200;
    ctx.body = { status: "up", data };
  } catch (error) {
    console.error("❌ Error checking workers heartbeat:", error);
    ctx.status = 503;
    ctx.body = { status: "down", error: error.message };
  }
});

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
      name: property.location,
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
        console.error(
          `❌ Error al consultar job: ${statusResponse.statusText}`
        );
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
      console.log(
        `⏳ Intento ${attempts + 1}/${maxAttempts} - Status: ${
          jobResult.status || "PENDING"
        }`
      );
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    // Verificar si se agotó el tiempo
    if (attempts >= maxAttempts && jobResult?.status !== "SUCCESS") {
      console.error(`⏱️ Timeout esperando job ${job_id}`);
      ctx.throw(504, "Timeout esperando recomendaciones del servicio");
    }

    // Extraer los IDs de las recomendaciones
    console.log("📦 jobResult completo:", JSON.stringify(jobResult, null, 2));

    const recommendations = jobResult?.result?.recommendations || [];
    console.log(`📋 Recomendaciones extraídas: ${recommendations.length}`);

    if (recommendations.length === 0) {
      console.log("⚠️ No se encontraron recomendaciones");
      ctx.status = 200;
      ctx.body = [];
      return;
    }

    const propertyIds = recommendations.map((rec) => rec.id);
    console.log(`🔍 IDs extraídos:`, propertyIds);
    console.log(
      `🔍 Tipos de IDs:`,
      propertyIds.map((id) => typeof id)
    );

    // Buscar las propiedades completas en la DB
    const properties = await Property.findAll({
      where: {
        id: propertyIds,
      },
    });

    console.log(`✅ Se encontraron ${properties.length} propiedades en la DB`);

    if (properties.length === 0) {
      console.log("⚠️ No se encontraron propiedades en DB con esos IDs");
      console.log("🔍 Verificando si existen propiedades con IDs similares...");

      // Buscar cualquier propiedad para comparar
      const sampleProperty = await Property.findOne();
      if (sampleProperty) {
        console.log(
          `📝 Ejemplo de propiedad en DB - ID: ${
            sampleProperty.id
          } (tipo: ${typeof sampleProperty.id})`
        );
      }
    }

    // Devolver las propiedades completas
    ctx.status = 200;
    ctx.body = properties;
  } catch (error) {
    console.error("❌ Error al obtener recomendaciones:", error);
    ctx.status = error.status || 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
