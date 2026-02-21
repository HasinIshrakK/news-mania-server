require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");

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
        process.exit(1);
    }
}

async function fetchNews() {
    if (!articlesCollection) {
        console.log("DB not ready yet...");
        return;
    }

    try {
        const response = await axios.get(
            "https://newsdata.io/api/1/news",
            {
                params: {
                    apikey: process.env.NEWSDATA_API_KEY,
                    language: "en"
                }
            }
        );

        const articles = response.data.results || [];

        for (let article of articles) {
            await articlesCollection.updateOne(
                { article_id: article.article_id },
                {
                    $set: {
                        ...article,
                        pubDate: new Date(article.pubDate)
                    }
                },
                { upsert: true }
            );
        }

        console.log(`News Updated: ${articles.length} articles processed`);
    } catch (err) {
        console.error("Ingestion Error:", err.response?.data || err.message);
    }
}

// Scheduling fetchNews to run every 6 hours
cron.schedule("0 */6 * * *", async () => {
    console.log("Running scheduled news ingestion...");
    await fetchNews();
});

app.get("/", (req, res) => {
    res.send("Server running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await connectDB();
    await fetchNews();
});