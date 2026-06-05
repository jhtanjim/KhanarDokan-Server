require("dotenv").config();
const { connectDB } = require("./config/db");
const app = require("./app");

const port = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(port, () => console.log(`dokan is running on ${port}`));
}).catch(console.dir);