const NewRelic = require('newrelic'); // Mantener como primera línea
const Koa = require("koa");
const Logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const router = require("./src");
const cors = require("@koa/cors");
const db = require("./src/models");

const app = new Koa();

app.use(bodyParser());
app.use(Logger());
app.use(router.routes()).use(router.allowedMethods());

db.sequelize.authenticate()
  .then(() => {
    console.log("Conectado a la base de datos");
    app.listen(3000, () => {
      console.log("API corriendo en puerto 3000");
    });
  })
  .catch(err => console.error("Error al conectar:", err.message));

