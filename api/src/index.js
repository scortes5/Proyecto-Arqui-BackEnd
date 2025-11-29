const Router = require("@koa/router");
const prueba = require("./routes/prueba");
const properties = require("./routes/properties");
const appointments = require("./routes/appointments");
const suggestions = require("./routes/suggestions");
const admin = require("./routes/admin");
const groupAppointments = require("./routes/groupAppointments");
const router = new Router();

// rutas
router.use("/prueba", prueba.routes());
router.use("/properties", properties.routes());
router.use("/appointments", appointments.routes());
router.use("/suggestions", suggestions.routes());
router.use("/admin", admin.routes());
router.use("/groupAppointments", groupAppointments.routes());

module.exports = router;
