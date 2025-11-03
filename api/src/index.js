const Router = require("@koa/router");
const test = require("./routes/test");
const properties = require("./routes/properties");
const appointments = require("./routes/appointments");
const suggestions = require("./routes/suggestions");
const wallet = require("./routes/wallet");

const router = new Router();

// rutas
router.use("/test", test.routes());
router.use("/properties", properties.routes());
router.use("/wallet", wallet.routes());
router.use("/appointments", appointments.routes());
router.use("/suggestions", suggestions.routes());

module.exports = router;
