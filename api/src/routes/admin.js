const Router = require("@koa/router");
const requireAdmin = require("../middlewares/adminMiddleware"); 
const router = new Router();

// Aplica el middleware a **todas las rutas de este router**
router.use(requireAdmin);


router.get("/dashboard", async (ctx) => {
  ctx.body = { message: `Welcome ${ctx.state.user.fullName} to the admin dashboard!` };
});


module.exports = router;
