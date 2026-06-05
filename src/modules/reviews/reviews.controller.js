const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

const col = () => getDB().collection("reviews");

exports.getReviews = async (req, res) => res.send(await col().find().toArray());
exports.addReview = async (req, res) => res.send(await col().insertOne(req.body));
exports.deleteReview = async (req, res) =>
  res.send(await col().deleteOne({ _id: new ObjectId(req.params.id) }));