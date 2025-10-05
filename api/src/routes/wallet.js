const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Wallet } = require('../models')



// -------------------------------------- METODO POST ---------------------------------------------
// /wallet/topup - OK
router.post("/topup", async (ctx) => {
  const { userId } = ctx.state.user;
  const {amount} = ctx.request.body;

  if (!amount || typeof amount !== "number") {
    ctx.throw(400, "Invalid amount");
  }

  const [wallet, created] = await Wallet.findOrCreate({
    where: { user_id: userId },
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
    userId: userId,
    new_balance: wallet.balance
  };
  ctx.status = 200;
});




// -------------------------------------- METODO GET ---------------------------------------------
// wallet/balance - OK
router.get("/balance", async (ctx) => {
  const { userId } = ctx.state.user;

  if (!userId || typeof userId !== "string") {
    ctx.throw(400, "Invalid or missing userId");
  }

  const [wallet] = await Wallet.findOrCreate({
    where: { user_id: userId },
    defaults: { balance: 0 }
  });

  ctx.body = { 
    userId: userId, 
    balance: wallet.balance };

  ctx.status = 200;
});




module.exports = router;


