const NewRelic = require('newrelic');
const db = require("./src/models");
const app = require("./app");

db.sequelize.authenticate()
  .then(() => {
    console.log("Conectado a la base de datos");
    app.listen(3000, () => {
      console.log("API corriendo en puerto 3000");
    });
  })
  .catch(err => console.error("Error al conectar:", err.message));
