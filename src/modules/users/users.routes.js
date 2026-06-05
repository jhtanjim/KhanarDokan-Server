const router = require("express").Router();
const ctrl = require("./users.controller");
const verifyToken = require("../../middlewares/verifyToken");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const verifySuperAdmin = require("../../middlewares/verifySuperAdmin");

router.post("/jwt", ctrl.generateJWT);
router.post("/users", ctrl.createUser);
router.get("/users", verifyToken, verifyAdmin, ctrl.getAllUsers);
router.patch("/users/:id", verifyToken, ctrl.updateProfile);
router.get("/users/admin/:email", verifyToken, ctrl.checkAdmin);
router.get("/users/superadmin/:email", verifyToken, ctrl.checkSuperAdmin);
router.delete("/users/:id", verifyToken, verifySuperAdmin, ctrl.deleteUser);
router.patch("/users/admin/:id", verifyToken, verifySuperAdmin, ctrl.makeAdmin);
router.patch("/users/superadmin/:id", verifyToken, verifySuperAdmin, ctrl.makeSuperAdmin);
router.patch("/users/demote/:id", verifyToken, verifySuperAdmin, ctrl.demoteUser);

module.exports = router;