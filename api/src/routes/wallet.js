const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Wallet } = require('../models')



// -------------------------------------- METODO POST ---------------------------------------------
// /wallet/topup - OK
router.post("/topup", async (ctx) => {
  // const { id: userId } = ctx.state.user;
  const user_id = ctx.request.body.user_id;
  const amount = ctx.request.body.amount;

  if (!amount || typeof amount !== "number") {
    ctx.throw(400, "Invalid amount");
  }

  const [wallet, created] = await Wallet.findOrCreate({
    where: { user_id: user_id },
    defaults: { balance: amount }
  });

  if (!created) {
    wallet.balance += amount;
    if (wallet.balance < 0){
      wallet.balance = 0;
    }
    await wallet.save();
  }

  ctx.body = {
    user_id: user_id,
    new_balance: wallet.balance
  };
  ctx.status = 200;
});




// -------------------------------------- METODO GET ---------------------------------------------
// wallet/balance - OK
router.get("/balance", async (ctx) => {
  const { user_id } = ctx.request.body;

  if (!user_id || typeof user_id !== "string") {
    ctx.throw(400, "Invalid or missing user_id");
  }

  const [wallet] = await Wallet.findOrCreate({
    where: { user_id },
    defaults: { balance: 0 }
  });

  ctx.body = { 
    user_id: user_id, 
    balance: wallet.balance };

  ctx.status = 200;
});




module.exports = router;


