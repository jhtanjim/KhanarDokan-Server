const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

const col = () => getDB().collection("support");

exports.createTicket = async (req, res) => {
  const t = req.body;
  if (!t.name || !t.email || !t.subject || !t.message)
    return res.status(400).send({ error: "Missing required fields" });
  t.createdAt = new Date();
  t.updatedAt = new Date();
  t.status = t.status || "open";
  t.priority = t.priority || "medium";
  const count = await col().countDocuments();
  t.ticketId = `T${String(count + 1).padStart(4, "0")}`;
  res.send(await col().insertOne(t));
};

exports.getUserTickets = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send({ error: "Email is required" });
  res.send(await col().find({ email }).sort({ createdAt: -1 }).toArray());
};

exports.getTicketById = async (req, res) => {
  const t = await col().findOne({ _id: new ObjectId(req.params.id) });
  if (!t) return res.status(404).send({ error: "Not found" });
  res.send(t);
};

exports.getAllTickets = async (req, res) => {
  const { status, priority, search } = req.query;
  const query = {};
  if (status && status !== "all") query.status = status;
  if (priority && priority !== "all") query.priority = priority;
  if (search) query.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
    { ticketId: { $regex: search, $options: "i" } }
  ];
  res.send(await col().find(query).sort({ createdAt: -1 }).toArray());
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const valid = ["open", "in-progress", "resolved", "closed"];
  if (!valid.includes(status)) return res.status(400).send({ error: "Invalid status" });
  const result = await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status, updatedAt: new Date() } }
  );
  if (!result.matchedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.updatePriority = async (req, res) => {
  const { priority } = req.body;
  const valid = ["low", "medium", "high", "urgent"];
  if (!valid.includes(priority)) return res.status(400).send({ error: "Invalid priority" });
  const result = await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { priority, updatedAt: new Date() } }
  );
  if (!result.matchedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.addResponse = async (req, res) => {
  const { response } = req.body;
  if (!response) return res.status(400).send({ error: "Response is required" });
  const result = await col().updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $push: { responses: { message: response, respondedBy: req.decoded.email, respondedAt: new Date() } },
      $set: { status: "in-progress", updatedAt: new Date() }
    }
  );
  if (!result.matchedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.deleteTicket = async (req, res) => {
  const result = await col().deleteOne({ _id: new ObjectId(req.params.id) });
  if (!result.deletedCount) return res.status(404).send({ error: "Not found" });
  res.send(result);
};

exports.getStats = async (req, res) => {
  const totalTickets = await col().countDocuments();
  const statusCounts = await col().aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();
  const priorityCounts = await col().aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]).toArray();
  const openTickets = await col().countDocuments({ status: { $in: ["open", "in-progress"] } });
  const urgentTickets = await col().countDocuments({ priority: "urgent", status: { $in: ["open", "in-progress"] } });
  res.send({ totalTickets, statusCounts, priorityCounts, openTickets, urgentTickets });
};