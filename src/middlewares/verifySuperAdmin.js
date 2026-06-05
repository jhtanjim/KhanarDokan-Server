const { getDB } = require("../config/db");

const verifySuperAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await getDB().collection("users").findOne({ email });
  if (user?.role !== "superadmin") return res.status(403).send({ message: "Super admin access required" });
  next();
};

module.exports = verifySuperAdmin;