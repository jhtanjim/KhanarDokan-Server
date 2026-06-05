const router = require("express").Router();
const ctrl = require("./reservations.controller");
const verifyToken = require("../../middlewares/verifyToken");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/reservations", ctrl.createReservation);
router.get("/reservations/availability", ctrl.checkAvailability);
router.get("/reservations", ctrl.getUserReservations);
router.get("/reservations/:id", ctrl.getReservationById);
router.patch("/reservations/:id/cancel", ctrl.cancelReservation);
router.get("/admin/reservations", verifyToken, verifyAdmin, ctrl.getAllReservations);
router.put("/admin/reservations/:id", verifyToken, verifyAdmin, ctrl.updateReservation);
router.patch("/admin/reservations/:id/status", verifyToken, verifyAdmin, ctrl.updateReservationStatus);
router.delete("/admin/reservations/:id", verifyToken, verifyAdmin, ctrl.deleteReservation);
router.get("/admin/reservation-stats", verifyToken, verifyAdmin, ctrl.getReservationStats);

module.exports = router;