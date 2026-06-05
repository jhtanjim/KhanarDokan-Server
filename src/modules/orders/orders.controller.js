const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const col = () => getDB().collection("orders");
const usersCol = () => getDB().collection("users");

exports.createPaymentIntent = async (req, res) => {
  const { amount, currency = "usd" } = req.body;
  if (!amount || amount <= 0) return res.status(400).send({ error: "Invalid amount" });
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
  });
  res.send({ clientSecret: paymentIntent.client_secret });
};

exports.createOrder = async (req, res) => {
  const order = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
  if (!order.email || !order.items || !order.totalPrice)
    return res.status(400).send({ error: "Missing required order data" });
  res.send(await col().insertOne(order));
};

exports.getUserOrders = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send({ error: "Email is required" });
  if (email !== req.decoded.email) return res.status(403).send({ message: "Forbidden" });
  res.send(await col().find({ email }).sort({ orderDate: -1 }).toArray());
};

exports.getOrderById = async (req, res) => {
  const order = await col().findOne({ _id: new ObjectId(req.params.id) });
  if (!order) return res.status(404).send({ error: "Order not found" });
  const isAdmin = await usersCol().findOne({ email: req.decoded.email, role: { $in: ["admin", "superadmin"] } });
  if (!isAdmin && order.email !== req.decoded.email) return res.status(403).send({ message: "Forbidden" });
  res.send(order);
};

exports.cancelOrder = async (req, res) => {
  const order = await col().findOne({ _id: new ObjectId(req.params.id) });
  if (!order) return res.status(404).send({ error: "Order not found" });
  if (order.email !== req.decoded.email) return res.status(403).send({ message: "Forbidden" });
  if (order.deliveryStatus !== "pending") return res.status(400).send({ error: "Only pending orders can be cancelled" });
  res.send(await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { deliveryStatus: "cancelled", updatedAt: new Date() } }
  ));
};

exports.getAllOrders = async (req, res) =>
  res.send(await col().find().sort({ orderDate: -1 }).toArray());

exports.updateOrderStatus = async (req, res) => {
  const { deliveryStatus } = req.body;
  const valid = ["pending", "processing", "delivered", "cancelled"];
  if (!valid.includes(deliveryStatus)) return res.status(400).send({ error: "Invalid status" });
  const result = await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { deliveryStatus, updatedAt: new Date() } }
  );
  if (!result.matchedCount) return res.status(404).send({ error: "Order not found" });
  res.send(result);
};

exports.deleteOrder = async (req, res) => {
  const result = await col().deleteOne({ _id: new ObjectId(req.params.id) });
  if (!result.deletedCount) return res.status(404).send({ error: "Order not found" });
  res.send({ message: "Order deleted successfully", deletedCount: result.deletedCount });
};

exports.getOrderStats = async (req, res) => {
  const totalOrders = await col().countDocuments();
  const totalRevenue = await col().aggregate([
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]).toArray();
  const statusCounts = await col().aggregate([
    { $group: { _id: "$deliveryStatus", count: { $sum: 1 } } }
  ]).toArray();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyRevenue = await col().aggregate([
    { $match: { orderDate: { $gte: sixMonthsAgo } } },
    { $group: { _id: { year: { $year: "$orderDate" }, month: { $month: "$orderDate" } }, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]).toArray();
  res.send({ totalOrders, totalRevenue: totalRevenue[0]?.total || 0, statusCounts, monthlyRevenue });
};