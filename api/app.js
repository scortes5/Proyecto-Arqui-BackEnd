const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const router = require("./src");

const app = new Koa();

app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  extendTypes: {
    json: ['application/x-javascript']
  }
}));

app.use(async (ctx, next) => {
  try {
    const body = ctx.request.body;
    
    if (body && body.body) {
      if (typeof body.body === 'string') {
        try {
          ctx.request.body = JSON.parse(body.body);
        } catch (e) {
          ctx.request.body = body.body;
        }
      } 
      else if (typeof body.body === 'object') {
        ctx.request.body = body.body;
    
      }
    }

    const apiGatewayHeaders = (body && body.headers) ? body.headers : {};
    const realHeaders = ctx.request.headers || {};

    const getHeader = (key) => {
      return apiGatewayHeaders[key] || 
             realHeaders[key] || 
             null;
    };

    ctx.state.user = {
      userId: getHeader("x-user-id"),
      userEmail: getHeader("x-user-email"),
      fullName: getHeader("x-user-full-name"),
      phoneNumber: getHeader("x-user-phone-number"),
      isAdmin: getHeader("x-is-admin") === "true",
      roles: getHeader("x-roles") || "",
    };

    if (!ctx.state.user.userId && ctx.path !== '/test' && ctx.path !== '/debug') {
      console.warn(`⚠️ No userId found for path: ${ctx.path}`);
    }

  } catch (err) {

    ctx.state.user = {
      userId: null,
      userEmail: null,
      fullName: null,
      phoneNumber: null,
      isAdmin: false,
      roles: "",
    };
  }

  await next();
});

app.use(router.routes()).use(router.allowedMethods());

app.on('error', (err, ctx) => {
  console.error('❌ Server error:', err);
});

module.exports = app;
