const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

const col = () => getDB().collection("carts");

exports.addToCart = async (req, res) => res.send(await col().insertOne(req.body));
exports.getCart = async (req, res) =>
  res.send(await col().find({ email: req.query.email }).toArray());
exports.deleteCartItem = async (req, res) =>
  res.send(await col().deleteOne({ _id: new ObjectId(req.params.id) }));
exports.clearCart = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send({ message: "Email is required" });
  res.send(await col().deleteMany({ email }));
};