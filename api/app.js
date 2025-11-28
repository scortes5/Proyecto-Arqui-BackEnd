const Koa = require("koa");
const Logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const router = require("./src");

const app = new Koa();

// 1. Logger - para ver todas las requests
app.use(Logger());

// 3. Body Parser - parsea el JSON que llega
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  extendTypes: {
    json: ['application/x-javascript']
  }
}));

// 4. Middleware para extraer datos de API Gateway y construir ctx.state.user
app.use(async (ctx, next) => {
  try {
    const body = ctx.request.body;
    
    console.log("📦 Body received:", JSON.stringify(body, null, 2));
    console.log("🔑 Headers received:", ctx.request.headers);

    // API Gateway envuelve el body real dentro de body.body
    if (body && body.body) {
      // Si body.body es un string JSON, parsearlo
      if (typeof body.body === 'string') {
        try {
          ctx.request.body = JSON.parse(body.body);
          console.log("✅ Body parsed from string");
        } catch (e) {
          console.warn("⚠️ body.body no es JSON válido, usando como está");
          ctx.request.body = body.body;
        }
      } 
      // Si body.body ya es un objeto, usarlo directamente
      else if (typeof body.body === 'object') {
        ctx.request.body = body.body;
        console.log("✅ Body usado directamente como objeto");
      }
    }
    // Si no hay body.body, el body ya es el correcto (local dev)
    else {
      console.log("ℹ️ No API Gateway wrapping detected");
    }

    // Extraer headers que vienen en body.headers (del mapping template)
    const apiGatewayHeaders = (body && body.headers) ? body.headers : {};
    
    // También considerar headers reales (por si llegan directamente)
    const realHeaders = ctx.request.headers || {};

    console.log("🔍 API Gateway headers:", apiGatewayHeaders);
    console.log("🔍 Real headers:", realHeaders);

    // Función helper para buscar header en múltiples fuentes
    const getHeader = (key) => {
      return apiGatewayHeaders[key] || 
             realHeaders[key] || 
             null;
    };

    // Construir ctx.state.user con los headers del authorizer
    ctx.state.user = {
      userId: getHeader("x-user-id"),
      userEmail: getHeader("x-user-email"),
      fullName: getHeader("x-user-full-name"),
      phoneNumber: getHeader("x-user-phone-number"),
      isAdmin: getHeader("x-is-admin") === "true",
      roles: getHeader("x-roles") || "",
    };

    console.log("✅ ctx.state.user constructed:", ctx.state.user);

    // Validación de userId (solo advertencia, no bloquea)
    if (!ctx.state.user.userId && ctx.path !== '/test' && ctx.path !== '/debug') {
      console.warn(`⚠️ No userId found for path: ${ctx.path}`);
    }

  } catch (err) {
    console.error("❌ Error en middleware de API Gateway:", err);
    // En caso de error, inicializar ctx.state.user vacío
    ctx.state.user = {
      userId: null,
      userEmail: null,
      fullName: null,
      phoneNumber: null,
      isAdmin: false,
      roles: "",
    };
  }

  await next();
});

// 5. Router - todas las rutas de la aplicación
app.use(router.routes()).use(router.allowedMethods());

// 6. Error handler global (opcional pero recomendado)
app.on('error', (err, ctx) => {
  console.error('❌ Server error:', err);
});

module.exports = app;
