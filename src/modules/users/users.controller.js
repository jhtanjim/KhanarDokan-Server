const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const usersCol = () => getDB().collection("users");

exports.generateJWT = (req, res) => {
  const token = jwt.sign(req.body, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
  res.send({ token });
};

exports.createUser = async (req, res) => {
  const user = req.body;
  const existing = await usersCol().findOne({ email: user.email });
  if (existing) return res.send({ message: "user already exists", insertedId: null });
  user.role = user.role || "user";
  user.createdAt = new Date();
  const result = await usersCol().insertOne(user);
  res.send(result);
};

exports.getAllUsers = async (req, res) => {
  const result = await usersCol().find().toArray();
  res.send(result);
};

exports.updateProfile = async (req, res) => {
  const { id } = req.params;
  const email = req.decoded.email;
  const user = await usersCol().findOne({ email });
  if (!user || user._id.toString() !== id) return res.status(403).send({ message: "Unauthorized" });
  const { displayName, phone, address, bio } = req.body;
  const result = await usersCol().updateOne(
    { _id: new ObjectId(id) },
    { $set: { displayName, phone, address, bio } }
  );
  res.send(result);
};

exports.checkAdmin = async (req, res) => {
  const { email } = req.params;
  if (email !== req.decoded.email) return res.status(403).send({ message: "Forbidden access" });
  const user = await usersCol().findOne({ email });
  res.send({ admin: user?.role === "admin" || user?.role === "superadmin" });
};

exports.checkSuperAdmin = async (req, res) => {
  const { email } = req.params;
  if (email !== req.decoded.email) return res.status(403).send({ message: "Forbidden access" });
  const user = await usersCol().findOne({ email });
  res.send({ superadmin: user?.role === "superadmin" });
};

exports.deleteUser = async (req, res) => {
  const result = await usersCol().deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
};

exports.makeAdmin = async (req, res) => {
  const result = await usersCol().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role: "admin" } }
  );
  res.send(result);
};

exports.makeSuperAdmin = async (req, res) => {
  const result = await usersCol().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role: "superadmin" } }
  );
  res.send(result);
};

exports.demoteUser = async (req, res) => {
  const result = await usersCol().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role: "user" } }
  );
  res.send(result);
};