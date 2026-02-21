require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

let db;
let articlesCollection;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("newsDB");
        articlesCollection = db.collection("articles");

        await articlesCollection.createIndex(
            { article_id: 1 },
            { unique: true }
        );

        console.log("MongoDB Connected");
    } catch (err) {
        console.error("DB Connection Error:", err.message);
    }
}

connectDB();

app.get("/", (req, res) => {
    res.send("Server running");
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});