const Router = require("@koa/router");
const test = require('./routes/test');
const properties = require('./routes/properties');

const router = new Router();

// rutas
router.use('/test', test.routes());
router.use('/properties', properties.routes());

module.exports = router;