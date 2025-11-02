const NewRelic = require('newrelic'); // Mantener como primera línea
const Koa = require("koa");
const Logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const router = require("./src");
const cors = require("@koa/cors");
const db = require("./src/models");

const app = new Koa();

app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  extendTypes: {
    json: ['application/x-javascript']
  }
}));

app.use(Logger());

app.use(cors())

app.use(async (ctx, next) => {
  try {
    const userId = ctx.request.headers["x-user-id"];
    const userEmail = ctx.request.headers["x-user-email"];
    const fullName = ctx.request.headers["x-user-full-name"];
    const phoneNumber = ctx.request.headers["x-user-phone-number"];
    console.log(`userEmail:${userEmail}, fullName:${fullName}, phoneNumber:${phoneNumber}`)

    if (userId) {
      ctx.state.user = {
        userId,
        userEmail
      };
    }
  } catch (err) {
    console.error("Error al obtener el userId:", err);
  }
  await next();
});


app.use(router.routes()).use(router.allowedMethods());

db.sequelize.authenticate()
  .then(() => {
    console.log("Conectado a la base de datos");
    app.listen(3000, () => {
      console.log("API corriendo en puerto 3000");
    });
  })
  .catch(err => console.error("Error al conectar:", err.message));

