const Koa = require("koa");
const Logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const router = require("./src");
const cors = require("@koa/cors");

const app = new Koa();

app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  extendTypes: {
    json: ['application/x-javascript']
  }
}));

app.use(Logger());
app.use(cors());

app.use(async (ctx, next) => {
  try {
    const headers = ctx.request.headers;

    ctx.state.user = {
      userId: headers["x-user-id"] || null,
      userEmail: headers["x-user-email"] || null,
      fullName: headers["x-user-full-name"] || null,
      phoneNumber: headers["x-user-phone-number"] || null,
      isAdmin: headers["x-is-admin"] === "true",
      roles: headers["x-roles"] || "",
    };
  } catch (err) {
    console.error("Error al obtener info del usuario:", err);
  }

  await next();
});

app.use(router.routes()).use(router.allowedMethods());

module.exports = app;
