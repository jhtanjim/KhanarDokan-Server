const { getDB } = require("../config/db");

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await getDB().collection("users").findOne({ email });
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  if (!isAdmin) return res.status(403).send({ message: "Forbidden access" });
  next();
};

module.exports = verifyAdmin;