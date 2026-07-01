const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();//no need for multer for now 
const path = require('path');//same
const fs = require('fs');//probably same
const app = express();
const config = require('./config')
const https = require('https');

app.use(express.static(path.join(__dirname, 'public')));//important
app.use(express.json());
app.set('view engine', 'ejs');
app.set('public', path.join(__dirname, 'public'));//important2
app.use(express.urlencoded({ extended: true }));
const { KategoriUpload,CheatUpload} = require('./cloudinary')
const Watch= require('./public/models/Watchmodel');
const user = require('./public/models/usermodel');
const Order = require('./public/models/ordermodel');
const dbURL = process.env.MONGO_URI;
 const axios = require('axios');
console.log("-------------------------------------------------");
console.log("🌍 SRV BAĞLANTISI DENENİYOR...");
mongoose.connect(dbURL)
  .then(async () => {
      console.log("Bağlantı Başarılı");
      try {
          // eski unique index constrainti sorun çıkardı 
          await mongoose.model('Watch').collection.dropIndex('referenceNumber_1');
          console.log("🚀 Old unique reference index dropped successfully.");
      } catch (err) {
          // index gittiyse görmezden gel
          if (err.code !== 27) { 
              console.error("Index drop failed:", err.message);
          }
      }
  })
  .catch(err => console.error(err));

const validateTxid = (req, res, next) => {
    const { txid } = req.body;
    const txidRegex = /^[a-fA-F0-9]{64}$/; 
    if (!txidRegex.test(txid)) {
        return res.status(400).send("Geçersiz TXID formatı. Lütfen kontrol edip tekrar girin.");
    }
    next();
};
async function verifyPayment(txid, method, expectedAmount) {
    try {
        const myAddress = config[`${method}Address`];
        let receivedAmount = 0;
        if (method === 'usdt') {
            const response = await axios.get(`https://apilist.tronscanapi.com/api/transaction-info?hash=${txid}`);
            const tx = response.data;
            if (Object.keys(tx).length === 0 || !tx.hash) {
                 return { success: false, message: "Böyle bir işlem (TXID) bulunamadı." };
            }
            if (tx.contractRet !== "SUCCESS" || !tx.confirmed) {
                return { success: false, message: "İşlem henüz onay almadı veya başarısız. Lütfen bekleyip tekrar deneyin." };
            }
            if (!tx.trc20TransferInfo) {
                 return { success: false, message: "Bu işlemde USDT transferi bulunamadı." };
            }
            const transfer = tx.trc20TransferInfo.find(t => t.to_address === myAddress && t.symbol === 'USDT');
            if (!transfer) {
                return { success: false, message: "Ödeme alıcısı eşleşmedi veya gönderilen coin USDT değil." };
            }
            receivedAmount = Number(transfer.amount_str) / 1000000;

        } 
        else {
            const networkMap = { ltc: 'litecoin', btc: 'bitcoin', xmr: 'monero' };
            const network = networkMap[method];
            if (!network) throw new Error("Desteklenmeyen yöntem!");

            const response = await axios.get(`https://api.blockchair.com/${network}/dashboards/transaction/${txid}`);
            const tx = response.data.data[txid];

            if (tx.transaction.block_id === -1 || tx.transaction.block_id === null) {
                return { success: false, message: "İşlem henüz onay almadı. Lütfen bekleyip tekrar deneyin." };
            }

            const recipientData = tx.outputs.find(out => out.recipient === myAddress);
            if (!recipientData) {
                return { success: false, message: "Ödeme alıcısı eşleşmedi." };
            }

            const decimalsMap = { ltc: 100000000, btc: 100000000, xmr: 1000000000000 };
            receivedAmount = Number(recipientData.value) / decimalsMap[method];
        }
        const expected = Number(expectedAmount);
        console.log(`DEBUG -> Yöntem: ${method.toUpperCase()}, Beklenen: ${expected.toFixed(5)}, Gelen: ${receivedAmount.toFixed(5)}`);

        if (isNaN(expected) || isNaN(receivedAmount) || expected <= 0) {
            return { success: false, message: "Sistem hatası: Tutar sayısal bir değer değil!" };
        }

        const minAcceptable = expected * 0.98;
        const maxAcceptable = expected * 1.05;

        if (receivedAmount < minAcceptable || receivedAmount > maxAcceptable) {
            return { 
                success: false, 
                message: `Tutar hatalı! Gereken: ${expected.toFixed(4)}, Gönderilen: ${receivedAmount.toFixed(4)}` 
            };
        }

        return { success: true };

    } catch (e) {
        // Axios API sorgusu 404 patlarsa (Blockchair için)
        if (e.response && e.response.status === 404) {
             return { success: false, message: "Böyle bir işlem (TXID) bulunamadı." };
        }
        console.error("Doğrulama hatası:", e.message);
        return { success: false, message: "Doğrulama sırasında ağ hatası oluştu." };
    }
}
app.get('/api/search', async (req, res) => {
    try {
        const searchQuery = req.query.q || '';
        let queryConditions = [];

        // 1. Arama Çubuğu Filtreleri (Metin + ID)
        if (searchQuery.trim() !== '') {
            queryConditions.push({ modelName: { $regex: searchQuery, $options: 'i' } });
            queryConditions.push({ name: { $regex: searchQuery, $options: 'i' } });
            queryConditions.push({ reference: { $regex: searchQuery, $options: 'i' } });
            queryConditions.push({ referenceNumber: { $regex: searchQuery, $options: 'i' } });
            queryConditions.push({ makeName: { $regex: searchQuery, $options: 'i' } });
            queryConditions.push({ brand: { $regex: searchQuery, $options: 'i' } });

            // Sayı kontrolü (ID araması)
            const isNumeric = !isNaN(searchQuery) && !isNaN(parseFloat(searchQuery));
            if (isNumeric) {
                queryConditions.push({ watchId: parseInt(searchQuery) });
            }
        }

        // Ana arama filtresini oluştur
        let finalQuery = queryConditions.length > 0 ? { $or: queryConditions } : {};

        // 2. Diğer Gizli Filtreleri de Ekle (Eğer seçildiyse)
        if (req.query.brand && req.query.brand !== 'all') {
            finalQuery.$and = finalQuery.$and || [];
            finalQuery.$and.push({ $or: [{ makeName: req.query.brand }, { brand: req.query.brand }] });
        }
        
        // Veritabanından veriyi çek
        const limit = 20;
        const watchesData = await Watch.find(finalQuery).limit(limit).lean();

        // Frontend'e temiz JSON formatında gönder
        res.json({ success: true, watches: watchesData });

    } catch (error) {
        console.error("API arama hatası:", error.message);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});
app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;

        // 1. Veri çekmece
        let watchesData = await Watch.find({ watchId: { $exists: true, $ne: null } }).lean();
        
        // Dinamik filtre listeleri
        const uniqueBrands = [...new Set(watchesData.map(w => w.makeName))].filter(Boolean).sort();
        
        // functionName virgülle ayrılmış string geldiği için parçalayıp temizliyoruz
        const allFeatures = watchesData.flatMap(w => w.functionName ? w.functionName.split(',').map(f => f.trim()) : []);
        const uniqueFeatures = [...new Set(allFeatures)].filter(Boolean).sort();
        
        const uniqueMovements = [...new Set(watchesData.map(w => w.movementName))].filter(Boolean).sort();
        const uniqueYears = [...new Set(watchesData.map(w => w.yearProducedName))].filter(Boolean).sort();

        // 2. Küresel Arama filtresi 
        if (req.query.q && req.query.q.trim() !== '') {
            const q = req.query.q.toLowerCase();
            watchesData = watchesData.filter(w => 
                (w.makeName && w.makeName.toLowerCase().includes(q)) ||
                (w.modelName && w.modelName.toLowerCase().includes(q)) ||
                (w.familyName && w.familyName.toLowerCase().includes(q)) ||
                (w.reference && w.reference.toLowerCase().includes(q))
            );
        }

        // 3. Marka Filtresi 
        if (req.query.brand && req.query.brand !== 'all') {
            const targetBrand = req.query.brand.toLowerCase();
            watchesData = watchesData.filter(w => w.makeName && w.makeName.toLowerCase() === targetBrand);
        }

        // 4. Maksimum Bütçe Filtresi
        if (req.query.maxPrice) {
            const maxPriceNum = parseInt(req.query.maxPrice);
            if (!isNaN(maxPriceNum)) {
                watchesData = watchesData.filter(w => {
                    if (!w.priceInEuro || w.priceInEuro === 'POA') return false;
                    const cleanPrice = parseInt(w.priceInEuro.replace(/\D/g, ''));
                    return !isNaN(cleanPrice) && cleanPrice <= maxPriceNum;
                });
            }
        }

        // 5. Gelişmiş Derin Filtreler 
        if (req.query.feature && req.query.feature !== 'all') {
            const targetFeature = req.query.feature.toLowerCase();
            watchesData = watchesData.filter(w => 
                w.functionName && w.functionName.toLowerCase().includes(targetFeature)
            );
        }

        if (req.query.movement && req.query.movement !== 'all') {
            const targetMovement = req.query.movement.toLowerCase();
            watchesData = watchesData.filter(w => w.movementName && w.movementName.toLowerCase() === targetMovement);
        }

        if (req.query.year && req.query.year !== 'all') {
            const targetYear = req.query.year;
            watchesData = watchesData.filter(w => w.yearProducedName === targetYear);
        }

        // 6. Sıralama Motoru 
        const activeSort = req.query.sort || 'default';
        if (activeSort === 'price_asc' || activeSort === 'price_desc') {
            watchesData = watchesData.filter(w => w.priceInEuro && w.priceInEuro !== 'POA');
            watchesData.sort((a, b) => {
                const priceA = parseInt(a.priceInEuro.replace(/\D/g, ''));
                const priceB = parseInt(b.priceInEuro.replace(/\D/g, ''));
                const finalA = isNaN(priceA) ? 0 : priceA;
                const finalB = isNaN(priceB) ? 0 : priceB;
                return activeSort === 'price_asc' ? finalA - finalB : finalB - finalA;
            });
        }

        // 7. sayfalama
        const totalRecords = watchesData.length;
        const totalPages = Math.ceil(totalRecords / limit) || 1;
        const skip = (page - 1) * limit;
        const paginatedWatches = watchesData.slice(skip, skip + limit);

        // 8. EJS Rendering Context
        res.render('main', {
            watches: paginatedWatches,
            uniqueBrands: uniqueBrands,
            uniqueFeatures: uniqueFeatures,
            uniqueMovements: uniqueMovements,
            uniqueYears: uniqueYears,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: req.query.q || '',
            selectedBrand: req.query.brand || 'all',
            selectedFeature: req.query.feature || 'all',
            selectedMovement: req.query.movement || 'all',
            selectedYear: req.query.year || 'all',
            selectedMaxPrice: req.query.maxPrice || '',
            selectedSort: activeSort,
            content: 'home',
            style: 'content.css'
        });

    } catch (error) {
        console.error("--> [FATAL ENGINE FAILURE]:", error.message);
        res.render('main', {
            watches: [], 
            uniqueBrands: [], 
            uniqueFeatures: [],
            uniqueMovements: [],
            uniqueYears: [],
            currentPage: 1, 
            totalPages: 1,
            searchQuery: '', 
            selectedBrand: 'all', 
            selectedFeature: 'all',
            selectedMovement: 'all',
            selectedYear: 'all',
            selectedMaxPrice: '', 
            selectedSort: 'default',
            content: 'home', 
            style: 'content.css'
        });
    }
});
app.get('/watches/:id', async (req, res) => {
    try {
        const watchId = req.params.id;
        let watch;

        // Gelen ID'nin MongoDB ObjectId mi yoksa RapidAPI watchId (sayı) mi olduğunu kontrol et
        if (!isNaN(watchId)) {
            watch = await Watch.findOne({ watchId: parseInt(watchId) });
        } else {
            watch = await Watch.findById(watchId);
        }

        if (!watch) {
            return res.status(404).send("Saat bulunamadı.");
        }

        // Ana layout şablonunu render et ve içeriğe detay sayfasını bas
        res.render('main', {
            content: 'watchDetail', // watchDetail.ejs dosyasını yükler
            watch: watch,
            style: 'content.css' // detay sayfasının özel stili
        });

    } catch (error) {
        console.error("Detay sayfası yüklenemedi:", error.message);
        res.status(500).send("Sunucu Hatası");
    }
});
// @ts-ignore
app.get('/saatBulucu', async (req, res) => {
    try {
        // Param yoksa direkt bos anketi firlat gec
        if (Object.keys(req.query).length === 0) {
            return res.render('main', { results: null, content: 'matcher', style: 'content.css' });
        }

        const { budget, environment, stage } = req.query;
        
        // Database'den ham datayı çekiyoruz, .lean() hız için şart
        let watchesData = await Watch.find({ watchId: { $exists: true, $ne: null } }).lean();

        // 1. Bütçe Kontrolü (Fakir eleme simülasyonu)
        if (budget) {
            const maxBudget = parseInt(budget);
            watchesData = watchesData.filter(w => {
                if (!w.priceInEuro || w.priceInEuro === 'POA') return false;
                const cleanPrice = parseInt(w.priceInEuro.replace(/\D/g, ''));
                return !isNaN(cleanPrice) && cleanPrice <= maxBudget;
            });
        }

        // 2. Vibe check
        if (environment === 'corporate') {
            // Ağır abi tarzı (Pure Dress)
            const corporateBrands = ['a. lange & söhne', 'vacheron constantin', 'patek philippe', 'longines'];
            watchesData = watchesData.filter(w => 
                (w.makeName && corporateBrands.includes(w.makeName.toLowerCase())) || 
                (w.familyName && (w.familyName.toLowerCase().includes('cellini') || w.familyName.toLowerCase().includes('classic')))
            );
        } else if (environment === 'sport') {
            // Halı saha / Dağ bayır / Flex tayfa
            const sportBrands = ['hublot', 'audemars piguet'];
            watchesData = watchesData.filter(w => 
                (w.makeName && sportBrands.includes(w.makeName.toLowerCase())) || 
                (w.familyName && (w.familyName.toLowerCase().includes('submariner') || w.familyName.toLowerCase().includes('gmt') || w.familyName.toLowerCase().includes('aquanaut')))
            );
        } else if (environment === 'everyday') {
            // Günlük casual takılmalık (Versatile)
            const everydayBrands = ['rolex', 'grand seiko', 'omega'];
            watchesData = watchesData.filter(w => 
                (w.makeName && everydayBrands.includes(w.makeName.toLowerCase())) &&
                (!w.familyName || (!w.familyName.toLowerCase().includes('cellini') && !w.familyName.toLowerCase().includes('hublot')))
            );
        }

        // 3. Koleksiyon Durumu (İlk saatse ucuzdan pahalıya, koleksiyonsa parayı sonuna kadar göm)
        watchesData.sort((a, b) => {
            const priceA = parseInt(a.priceInEuro.replace(/\D/g, '')) || 0;
            const priceB = parseInt(b.priceInEuro.replace(/\D/g, '')) || 0;
            return stage === 'first' ? priceA - priceB : priceB - priceA;
        });

        // Sadece en iyi 3 kombini fırlatıyoruz (Gatekeeping)
        const topMatches = watchesData.slice(0, 3);

        res.render('main', {
            results: topMatches,
            content: 'matcher',
            style: 'content.css'
        });

    } catch (error) {
        console.error("--> [ALGORITMA PATLADI]:", error.message);
        res.render('main', { results: [], content: 'matcher', style: 'content.css' });
    }
});

// API'in SSL Sertifikasıyla uğraşmaca, unsafe agent
const unsafeAgent = new https.Agent({ rejectUnauthorized: false });

app.get('/proxy-watch-image', async (req, res) => {
    const { watchId, imageName } = req.query;
    
    if (!watchId || !imageName) {
        return res.status(400).send('Missing parameters');
    }

    const targetUrl = `https://api-watches-v2.makingdatameaningful.com/files/watches/${watchId}/watch/${imageName}`;

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            httpsAgent: unsafeAgent // ERR_CERT_AUTHORITY_INVALID için
        });

        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        console.error(`--> [PROXY FAILURE]: Failed to fetch image for ID ${watchId}`);
        res.redirect('https://placehold.co/400x600/141414/888888?text=Image+Not+Found');
    }
});;

// Portu dinlemeye alıyoruz (Engine Start)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} üzerinde aktif.`);
});

