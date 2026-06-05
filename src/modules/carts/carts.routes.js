const router = require("express").Router();
const ctrl = require("./carts.controller");
const verifyToken = require("../../middlewares/verifyToken");

router.post("/carts", verifyToken, ctrl.addToCart);
router.get("/carts", verifyToken, ctrl.getCart);
router.delete("/carts/:id", verifyToken, ctrl.deleteCartItem);
router.delete("/carts", verifyToken, ctrl.clearCart);

module.exports = router;