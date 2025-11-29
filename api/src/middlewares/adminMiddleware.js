// Middleware específico para rutas admin
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || !ctx.state.user.isAdmin) {
    ctx.status = 403;
    ctx.body = { message: "Admin access required" };
    return;
  }
  await next();
};

module.exports = requireAdmin;
