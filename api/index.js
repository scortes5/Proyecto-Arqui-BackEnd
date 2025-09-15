const Koa = require("koa");
const Logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const router = require("./src");
const cors = require("@koa/cors");
const db = require("./src/models");

const app = new Koa();

app.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser());
app.use(Logger());
app.use(router.routes()).use(router.allowedMethods());

db.sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Base de datos sincronizada");
    app.listen(3000, () => {
      console.log("API corriendo en puerto 3000");
    });
  })
  .catch((err) => {
    console.error("Error al sincronizar la base de datos:", err.message);
  });
