const router = require("express").Router();
const ctrl = require("./orders.controller");
const verifyToken = require("../../middlewares/verifyToken");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/create-payment-intent", verifyToken, ctrl.createPaymentIntent);
router.post("/orders", verifyToken, ctrl.createOrder);
router.get("/orders", verifyToken, ctrl.getUserOrders);
router.get("/orders/:id", verifyToken, ctrl.getOrderById);
router.patch("/orders/:id/cancel", verifyToken, ctrl.cancelOrder);
router.get("/admin/orders", verifyToken, verifyAdmin, ctrl.getAllOrders);
router.patch("/admin/orders/:id", verifyToken, verifyAdmin, ctrl.updateOrderStatus);
router.delete("/admin/orders/:id", verifyToken, verifyAdmin, ctrl.deleteOrder);
router.get("/admin/order-stats", verifyToken, verifyAdmin, ctrl.getOrderStats);

module.exports = router;