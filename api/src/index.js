const Router = require("@koa/router");
const prueba = require("./routes/prueba");
const properties = require("./routes/properties");
const appointments = require("./routes/appointments");
const suggestions = require("./routes/suggestions");
const groupAppointments = require("./routes/groupAppointments");
const auctions = require("./routes/auctions");
const router = new Router();

// rutas
router.use("/prueba", prueba.routes());
router.use("/auctions", auctions.routes());
router.use("/properties", properties.routes());
router.use("/appointments", appointments.routes());
router.use("/suggestions", suggestions.routes());
router.use("/groupAppointments", groupAppointments.routes());
router.use("/auctions", auctions.routes());

module.exports = router;
