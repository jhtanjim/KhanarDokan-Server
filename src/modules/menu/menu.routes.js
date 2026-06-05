const router = require("express").Router();
const ctrl = require("./menu.controller");
const verifyToken = require("../../middlewares/verifyToken");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.get("/menu", ctrl.getMenu);
router.post("/menu", verifyToken, verifyAdmin, ctrl.addMenuItem);
router.put("/menu/:id", verifyToken, verifyAdmin, ctrl.updateMenuItem);
router.delete("/menu/:id", verifyToken, verifyAdmin, ctrl.deleteMenuItem);

module.exports = router;