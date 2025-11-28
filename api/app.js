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
    let userHeaders = {};

    // Caso 1: Integration Request manda headers en ctx.request.body.headers
    if (ctx.request.body && ctx.request.body.headers) {
      userHeaders = ctx.request.body.headers;
    }

    // Caso 2: Si algún día agregas headers reales
    const realHeaders = ctx.request.headers;

    ctx.state.user = {
      userId: userHeaders["x-user-id"] || realHeaders["x-user-id"] || null,
      userEmail: userHeaders["x-user-email"] || realHeaders["x-user-email"] || null,
      fullName: userHeaders["x-user-full-name"] || realHeaders["x-user-full-name"] || null,
      phoneNumber: userHeaders["x-user-phone-number"] || realHeaders["x-user-phone-number"] || null,
      isAdmin:
        (userHeaders["x-is-admin"] || realHeaders["x-is-admin"] || "false") === "true",
      roles: userHeaders["x-roles"] || realHeaders["x-roles"] || "",
    };

  } catch (err) {
    console.error("Error building ctx.state.user:", err);
  }

  await next();
});


app.use(router.routes()).use(router.allowedMethods());

module.exports = app;
