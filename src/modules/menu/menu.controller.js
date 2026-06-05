const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

const menuCol = () => getDB().collection("menu");

exports.getMenu = async (req, res) => {
  res.send(await menuCol().find().toArray());
};

exports.addMenuItem = async (req, res) => {
  const item = { ...req.body, createdAt: new Date() };
  res.send(await menuCol().insertOne(item));
};

exports.updateMenuItem = async (req, res) => {
  const item = { ...req.body, updatedAt: new Date() };
  const result = await menuCol().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: item }
  );
  res.send(result);
};

exports.deleteMenuItem = async (req, res) => {
  res.send(await menuCol().deleteOne({ _id: new ObjectId(req.params.id) }));
};