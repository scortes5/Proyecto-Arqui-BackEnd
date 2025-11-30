const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware");
const router = new Router();



router.get("/", async (ctx) => {
  ctx.body = {
    message: `Endpoints para obtener agendamientos para el grupo. Disponible para admin y para usuarios normales`,
  };
});

// SOLO ADMIN
router.post("/buy", requireAdmin, async (ctx) => {
  ctx.body = {
    message: `Endpoints para comprar agendamientos para el grupo. Disponible para admin`,
  };
});

// SOLO ADMIN
router.post("/:propertyId/discount", requireAdmin, async (ctx) => {
  ctx.body = {
    message: `Endpoints para aplicar descuento a un agendamiento para el grupo. Disponible para admin`,
  };
});



module.exports = router;
