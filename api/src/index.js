const Router = require("@koa/router");
const prueba = require("./routes/prueba");
const properties = require("./routes/properties");
const appointments = require("./routes/appointments");
const wallet = require("./routes/wallet");
const suggestions = require("./routes/suggestions");
const admin = require("./routes/admin");
const router = new Router();

// rutas
router.use("/prueba", prueba.routes());
router.use("/properties", properties.routes());
router.use("/wallet", wallet.routes());
router.use("/appointments", appointments.routes());
router.use("/suggestions", suggestions.routes());
router.use("/admin", admin.routes());

module.exports = router;
