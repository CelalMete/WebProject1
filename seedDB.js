// syncDB.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Watch = require('./public/models/Watchmodel');

const dbURL = process.env.MONGO_URI;
const MAKE_ID = 137; // Rolex
const LIMIT = 20;

async function syncCatalog() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(dbURL);
        console.log("Database connected successfully.");

        let currentPage = 73;
        let totalPages = 191;
        let totalSynced = 1440;

        do {
            console.log(`Fetching page ${currentPage} of ${totalPages || 'unknown'} from RapidAPI...`);
            
            const options = {
                method: 'GET',
                url: `https://watch-database1.p.rapidapi.com/watches/make/${MAKE_ID}/page/${currentPage}/limit/${LIMIT}`,
                headers: {
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                    'x-rapidapi-host': 'watch-database1.p.rapidapi.com'
                }
            };

            const response = await axios.request(options);
            const watches = response.data.watches || [];
            totalPages = response.data.allPages || 1;

            if (watches.length === 0) {
                console.log("No more records found.");
                break;
            }

            // Map data structure and build bulk write operations
            const bulkOps = watches.map(watch => ({
                updateOne: {
                    filter: { watchId: watch.watchId },
                    update: { $set: watch },
                    upsert: true // Insert if new, update if existing
                }
            }));

            await Watch.bulkWrite(bulkOps);
            totalSynced += watches.length;
            console.log(`Successfully processed page ${currentPage}. Total synced: ${totalSynced}`);

            currentPage++;
            
            // Optional: Add a small timeout to avoid hitting rapid-fire rate limits
            await new Promise(resolve => setTimeout(resolve, 2500));

        } while (currentPage <= totalPages);

        console.log(`Data synchronization complete. Total records in local Atlas: ${totalSynced}`);
        process.exit(0);

    } catch (error) {
        console.error("Synchronization pipeline failed:", error.message);
        process.exit(1);
    }
}

syncCatalog();