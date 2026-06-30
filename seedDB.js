require('dotenv').config();
const mongoose = require('mongoose');
const Watch = require('./public/models/Watchmodel');

const dbURL = process.env.MONGO_URI || process.env.CONNECTION_STRING;

// --- API'DEN GELEN TÜM JSON OBJESİNİ OLDUĞU GİBİ BURAYA YAPIŞTIRIN ---
const apiResponse ={
  "count": 1119,
  "page": 1,
  "allPages": 56,
  "limit": 20,
  "watches": [
    {
      "id": 11414,
      "watchId": 426036,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "595",
      "reference": "H11221914",
      "watchImageName": "h11221914-c7.jpg"
    },
    {
      "id": 11415,
      "watchId": 704436,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Yellow Gold / Janey Bryant",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "",
      "reference": "H11241810",
      "watchImageName": "h11241810-86.jpg"
    },
    {
      "id": 11416,
      "watchId": 748247,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 23.4 Stainless Steel / Silver / Bracelet",
      "familyName": "American Classic",
      "yearProducedName": "2024",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "535",
      "reference": "H11421114",
      "watchImageName": "h11421114-af.jpg"
    },
    {
      "id": 11417,
      "watchId": 980246,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 23.4 Stainless Steel / Silver - Green",
      "familyName": "American Classic",
      "yearProducedName": "2024",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "460",
      "reference": "H11421014",
      "watchImageName": "h11421014-e6.jpg"
    },
    {
      "id": 11418,
      "watchId": 156991,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 23.4 Stainless Steel / Silver - Beige",
      "familyName": "American Classic",
      "yearProducedName": "2024",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "",
      "reference": "H11421514",
      "watchImageName": "h11421514-f7.jpg"
    },
    {
      "id": 11419,
      "watchId": 451596,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Yellow Gold / Green",
      "familyName": "American Classic",
      "yearProducedName": "2024",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "575",
      "reference": "H11261760",
      "watchImageName": "h11261760-6b.jpg"
    },
    {
      "id": 11420,
      "watchId": 698125,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver",
      "familyName": "American Classic",
      "yearProducedName": "2024",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221750",
      "watchImageName": "h11221750-85.jpg"
    },
    {
      "id": 11421,
      "watchId": 191471,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver",
      "familyName": "American Classic",
      "yearProducedName": "2024",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221550",
      "watchImageName": "h11221550-f9.jpg"
    },
    {
      "id": 11422,
      "watchId": 302472,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver - Pink",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221853",
      "watchImageName": "h11221853-d8.jpg"
    },
    {
      "id": 11423,
      "watchId": 167888,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Janey Bryant",
      "familyName": "American Classic",
      "yearProducedName": "2021",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "",
      "reference": "H11221850",
      "watchImageName": "h11221850-a2.jpg"
    },
    {
      "id": 11424,
      "watchId": 147754,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221014",
      "watchImageName": "h11221014-cf.jpg"
    },
    {
      "id": 11425,
      "watchId": 219304,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver - Light Green",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "595",
      "reference": "H11221852",
      "watchImageName": "h11221852-81.jpg"
    },
    {
      "id": 11426,
      "watchId": 64565,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver",
      "familyName": "American Classic",
      "yearProducedName": null,
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "485",
      "reference": "H11211553",
      "watchImageName": "h11211553-f5.jpg"
    },
    {
      "id": 11427,
      "watchId": 675762,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver - Orange",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221851",
      "watchImageName": "h11221851-bc.jpg"
    },
    {
      "id": 11428,
      "watchId": 507138,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 23.4 Stainless Steel / Silver - Pink",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "",
      "reference": "H11421814",
      "watchImageName": "h11421814-fd.jpg"
    },
    {
      "id": 11429,
      "watchId": 961391,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver - Pink",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221814",
      "watchImageName": "h11221814-f4.jpg"
    },
    {
      "id": 11430,
      "watchId": 38973,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221514",
      "watchImageName": "h11221514-5f.jpg"
    },
    {
      "id": 11431,
      "watchId": 170428,
      "makeName": "Hamilton",
      "modelName": "Ardmore Quartz 18.7 Stainless Steel / Silver - Turquoise",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": "ETA 980.163 caliber",
      "functionName": "Hours, Minutes, Small Seconds",
      "priceInEuro": "520",
      "reference": "H11221650",
      "watchImageName": "h11221650-d8.jpg"
    },
    {
      "id": 11432,
      "watchId": 335925,
      "makeName": "Hamilton",
      "modelName": "PSR Digital Quartz PVD / Red",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": null,
      "functionName": null,
      "priceInEuro": "1145",
      "reference": "H52404130",
      "watchImageName": "h52404130-f.jpg"
    },
    {
      "id": 11433,
      "watchId": 186315,
      "makeName": "Hamilton",
      "modelName": "PSR Digital Quartz Stainless Steel / Green",
      "familyName": "American Classic",
      "yearProducedName": "2022",
      "limitedName": "No",
      "descriptionContent": null,
      "movementName": null,
      "functionName": null,
      "priceInEuro": "845",
      "reference": "H52414131",
      "watchImageName": "h52414131-cf.jpg"
    }
  ]
};

async function seedLocalData() {
    try {
        if (!dbURL) {
            throw new Error(".env dosyasında veritabanı bağlantı adresi bulunamadı!");
        }

        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(dbURL);
        console.log("Database connected successfully.");

        // Ana objenin içindeki 'watches' dizisini ayırıyoruz
        const watchesArray = apiResponse.watches || [];

        if (watchesArray.length === 0) {
            console.log("Girdiğiniz objenin içinde ayıklanacak 'watches' dizisi bulunamadı.");
            process.exit(0);
        }

        console.log(`\nToplam ${watchesArray.length} adet saat ayıklandı. Veritabanına işleniyor...`);

        // Ayıklanan dizideki her bir saati tek tek mapleyip bulkWrite hazırlığı yapıyoruz
        const bulkOps = watchesArray.map(watch => ({
            updateOne: {
                filter: { watchId: watch.watchId }, // Aynı saatId varsa mükerrer kayıt yapmaz, günceller
                update: { $set: watch },
                upsert: true
            }
        }));

        const result = await Watch.bulkWrite(bulkOps);
        
        console.log("=========================================");
        console.log(` Başarılı! Saatler ayrıştırıldı ve eklendi.`);
        console.log(` Veritabanına Sıfırdan Eklenen: ${result.upsertedCount}`);
        console.log(` Zaten Var Olup Güncellenen: ${result.modifiedCount}`);
        console.log("=========================================");

        process.exit(0);
    } catch (error) {
        console.error("\nSeeding failed:", error.message);
        process.exit(1);
    }
}

seedLocalData();