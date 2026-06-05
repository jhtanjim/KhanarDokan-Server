const router = require("express").Router();
const ctrl = require("./reviews.controller");
const verifyToken = require("../../middlewares/verifyToken");

router.get("/reviews", ctrl.getReviews);
router.post("/reviews", ctrl.addReview);
router.delete("/reviews/:id", verifyToken, ctrl.deleteReview);

module.exports = router;