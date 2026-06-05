const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

const col = () => getDB().collection("reservations");

exports.createReservation = async (req, res) => {
  const r = req.body;
  if (!r.customerName || !r.email || !r.phone || !r.date || !r.time || !r.guests)
    return res.status(400).send({ error: "Missing required fields" });
  r.createdAt = new Date();
  r.updatedAt = new Date();
  r.status = r.status || "pending";
  const count = await col().countDocuments();
  r.reservationId = `R${String(count + 1).padStart(3, "0")}`;
  res.send(await col().insertOne(r));
};

exports.getUserReservations = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send({ error: "Email is required" });
  res.send(await col().find({ email }).sort({ date: -1 }).toArray());
};

exports.getReservationById = async (req, res) => {
  const r = await col().findOne({ _id: new ObjectId(req.params.id) });
  if (!r) return res.status(404).send({ error: "Not found" });
  res.send(r);
};

exports.checkAvailability = async (req, res) => {
  const { date, time } = req.query;
  if (!date || !time) return res.status(400).send({ error: "Date and time are required" });
  const booked = await col().find({ date, time, status: { $in: ["pending", "confirmed"] } }).toArray();
  const allTables = ["Window View", "Private Booth", "Chef's Table", "Garden Terrace"];
  const bookedTables = booked.map(r => r.table);
  res.send({ availableTables: allTables.filter(t => !bookedTables.includes(t)), bookedTables });
};

exports.cancelReservation = async (req, res) => {
  const { email } = req.body;
  const r = await col().findOne({ _id: new ObjectId(req.params.id) });
  if (!r) return res.status(404).send({ error: "Not found" });
  if (r.email !== email) return res.status(403).send({ message: "Forbidden" });
  if (r.status === "cancelled") return res.status(400).send({ error: "Already cancelled" });
  res.send(await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "cancelled", updatedAt: new Date() } }
  ));
};

exports.getAllReservations = async (req, res) => {
  const { status, date, search } = req.query;
  const query = {};
  if (status && status !== "all") query.status = status;
  if (date) query.date = date;
  if (search) query.$or = [
    { customerName: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
    { reservationId: { $regex: search, $options: "i" } }
  ];
  res.send(await col().find(query).sort({ createdAt: -1 }).toArray());
};

exports.updateReservation = async (req, res) => {
  const data = { ...req.body, updatedAt: new Date() };
  delete data._id;
  delete data.createdAt;
  delete data.reservationId;
  const result = await col().updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
  if (!result.matchedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.updateReservationStatus = async (req, res) => {
  const { status } = req.body;
  const valid = ["pending", "confirmed", "cancelled", "completed"];
  if (!valid.includes(status)) return res.status(400).send({ error: "Invalid status" });
  const result = await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status, updatedAt: new Date() } }
  );
  if (!result.matchedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.deleteReservation = async (req, res) => {
  const result = await col().deleteOne({ _id: new ObjectId(req.params.id) });
  if (!result.deletedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.getReservationStats = async (req, res) => {
  const totalReservations = await col().countDocuments();
  const statusCounts = await col().aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]).toArray();
  const today = new Date().toISOString().split("T")[0];
  const todayReservations = await col().countDocuments({ date: today });
  const upcomingReservations = await col().countDocuments({
    date: { $gte: today },
    status: { $in: ["pending", "confirmed"] }
  });
  res.send({ totalReservations, statusCounts, todayReservations, upcomingReservations });
};