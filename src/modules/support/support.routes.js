const router = require("express").Router();
const ctrl = require("./support.controller");
const verifyToken = require("../../middlewares/verifyToken");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/support", ctrl.createTicket);
router.get("/support", ctrl.getUserTickets);
router.get("/support/:id", ctrl.getTicketById);
router.get("/admin/support", verifyToken, verifyAdmin, ctrl.getAllTickets);
router.patch("/admin/support/:id/status", verifyToken, verifyAdmin, ctrl.updateStatus);
router.patch("/admin/support/:id/priority", verifyToken, verifyAdmin, ctrl.updatePriority);
router.post("/admin/support/:id/response", verifyToken, verifyAdmin, ctrl.addResponse);
router.delete("/admin/support/:id", verifyToken, verifyAdmin, ctrl.deleteTicket);
router.get("/admin/support-stats", verifyToken, verifyAdmin, ctrl.getStats);

module.exports = router;