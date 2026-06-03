//API ingestion script 

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// Saat Şeması
const watchSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    referenceNumber: { type: String, required: true, unique: true },
    caliber: String,
    caseMaterial: String,
    imageUrl: String
});

// Saati modele compile etmece
const Watch = mongoose.model('Watch', watchSchema);

// Seeding Mantığı
async function seedDatabase() {
    try {
        // MongoDB cluster baglantisi
        console.log('Connecting to Database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // RapidAPI Request 
        const options = {
            method: 'GET',
            url: 'YOUR_RAPIDAPI_ENDPOINT_URL',
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'YOUR_RAPIDAPI_HOST'
            }
        };

        console.log('Fetching data from API...');
        const response = await axios.request(options);
        const apiData = response.data; // JSON response'undan doğru array'ı aldığından emin ol

        // API'i Mongoose şemasına uydur
        const formattedWatches = apiData.map(item => ({
            brand: item.brand_name || 'Unknown',
            referenceNumber: item.reference || 'N/A',
            caliber: item.movement || 'N/A',
            caseMaterial: item.case_material || 'N/A',
            imageUrl: item.image_url || ''
        }));

        console.log(`Prepared ${formattedWatches.length} records. Inserting...`);
        
        // Opsiyonel eski veri silme
        await Watch.deleteMany({}); 
        
        // Hepsini insert et
        await Watch.insertMany(formattedWatches);
        console.log('Database seeded successfully.');

    } catch (error) {
        console.error('Fatal Error during seeding:', error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}

// Fonksiyonu çalıştır
seedDatabase();