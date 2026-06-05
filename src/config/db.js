const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.khwex9e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

const connectDB = async () => {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected to MongoDB!");
  db = client.db("khanarDokanDB");
};

const getDB = () => {
  if (!db) throw new Error("DB not connected yet");
  return db;
};

module.exports = { connectDB, getDB, client };