const express = require("express");
const cors = require("cors");

const usersRoutes = require("./modules/users/users.routes");
const menuRoutes = require("./modules/menu/menu.routes");
const reviewsRoutes = require("./modules/reviews/reviews.routes");
const cartsRoutes = require("./modules/carts/carts.routes");
const ordersRoutes = require("./modules/orders/orders.routes");
const reservationsRoutes = require("./modules/reservations/reservations.routes");
const supportRoutes = require("./modules/support/support.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", usersRoutes);
app.use("/", menuRoutes);
app.use("/", reviewsRoutes);
app.use("/", cartsRoutes);
app.use("/", ordersRoutes);
app.use("/", reservationsRoutes);
app.use("/", supportRoutes);

app.get("/", (req, res) => res.send("khanar dokan running"));

module.exports = app;