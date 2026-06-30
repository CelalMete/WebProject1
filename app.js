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
const category = require('./public/models/category')
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

app.get('/', async (req, res) => { //20. defa bastan yaziyoruz, bu sefer sort by mantigi calismadi
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;

        let watchesData = await Watch.find({ watchId: { $exists: true, $ne: null } }).lean();

        const uniqueBrands = [...new Set(watchesData.map(w => w.makeName))].filter(Boolean).sort();

        if (req.query.q && req.query.q.trim() !== '') {
            const q = req.query.q.toLowerCase();
            watchesData = watchesData.filter(w => 
                (w.makeName && w.makeName.toLowerCase().includes(q)) ||
                (w.modelName && w.modelName.toLowerCase().includes(q)) ||
                (w.familyName && w.familyName.toLowerCase().includes(q)) ||
                (w.reference && w.reference.toLowerCase().includes(q))
            );
        }

        if (req.query.brand && req.query.brand !== 'all') {
            const targetBrand = req.query.brand.toLowerCase();
            watchesData = watchesData.filter(w => w.makeName && w.makeName.toLowerCase() === targetBrand);
        }

        if (req.query.maxPrice) {
            const maxPriceNum = parseInt(req.query.maxPrice);
            if (!isNaN(maxPriceNum)) {
                watchesData = watchesData.filter(w => {
                    if (!w.priceInEuro || w.priceInEuro === 'POA') return false;
                    //Sayisal olmayan karakter silmece
                    const cleanPrice = parseInt(w.priceInEuro.replace(/\D/g, ''));
                    return !isNaN(cleanPrice) && cleanPrice <= maxPriceNum;
                });
            }
        }

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

        const totalRecords = watchesData.length;
        const totalPages = Math.ceil(totalRecords / limit) || 1;
        const skip = (page - 1) * limit;
        const paginatedWatches = watchesData.slice(skip, skip + limit);

        res.render('main', {
            watches: paginatedWatches,
            uniqueBrands: uniqueBrands,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: req.query.q || '',
            selectedBrand: req.query.brand || 'all',
            selectedMaxPrice: req.query.maxPrice || '',
            selectedSort: activeSort,
            content: 'home',
            style: 'content.css'
        });

    } catch (error) {
        console.error("--> [FATAL ENGINE FAILURE]:", error.message);
        res.render('main', {
            watches: [], uniqueBrands: [], currentPage: 1, totalPages: 1,
            searchQuery: '', selectedBrand: 'all', selectedMaxPrice: '', selectedSort: 'default',
            content: 'home', style: 'content.css'
        });
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
});

app.get('/uploadcheat2', async (req, res) => {
    const games = await category.find(); // Kategori listesini çek
    res.render('main', {
        games, // Formdaki select için gerekli
        content: 'upladncheat',
        style: 'store.css'
    });
});
app.get('/uploadcheat',async(req,res)=>{
   res.render('main',{
      content:'upload',
      style:'store.css'
   })
})
app.get('/category/:id',async(req,res)=>{
   let id=req.params.id;
   const cheats= await Watch.find( {brand:id})
   res.render('main',{
      cheats,
      content:'game',
      style:'store.css'
   })
})
app.get('/cheats/:id',async(req,res)=>{
   const cheatinfo= await Watch.findById(req.params.id)
   const brand = await category.findById(cheatinfo.brand)
   res.render('main',{
      cheat:cheatinfo,
      content:'cheat',brand,
      style:'store.css'
   })
})
app.get('/checkout', async (req, res) => {
    try {
        if (!req.query.cart) return res.status(400).send("Sepet boş veya geçersiz yönlendirme!");
        
        const cartArray = JSON.parse(req.query.cart); // Frontend'den gelen [{id, title, qty}] dizisi
        const wallets = {
            ltc: process.env.LTC_WALLET_ADDRESS,
            usdt: process.env.USDT_WALLET_ADDRESS,
            btc: process.env.BTC_WALLET_ADDRESS,
            xmr: process.env.XMR_WALLET_ADDRESS
        };
        
        let totalPrice = 0;
        let verifiedItems = []; // EJS sayfasına göndereceğimiz güvenli ürün listesi

        // Sepetteki her bir ürünü DB'den bul ve fiyatını hesapla
        for (let item of cartArray) {
            const product = await Watch.findById(item.id);
            if (!product) continue;
            
            const selectedPackage = product.Price.find(p => p.PriceTitle === item.title);
            if (selectedPackage) {
                const itemTotal = selectedPackage.Price * item.qty;
                totalPrice += itemTotal;
                
                verifiedItems.push({
                    cheatId: product._id,
                    cheatName: product.CheatName,
                    packageTitle: selectedPackage.PriceTitle,
                    price: selectedPackage.Price,
                    qty: item.qty,
                    itemTotal: itemTotal
                });
            }
        }

        if (verifiedItems.length === 0) return res.status(404).send("Geçerli hile bulunamadı!");

        res.render('main', {
            content: 'order', 
            style: 'payment.css',
            items: verifiedItems, // Artık EJS'ye tek ürün değil, Ürünler Dizisi yolluyoruz
            totalPrice: totalPrice, // Sepetin Toplam Tutarı
            wallets: wallets,
            cartDataRaw: req.query.cart // Bunu formu postlarken kullanacağız
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Ödeme sayfası yüklenirken bir hata oluştu.");
    }
});
app.post('/submit-payment', validateTxid, async (req, res) => {
    try {
        // Formdan gizli input ile cartDataRaw'ı (JSON) çekiyoruz
        const { cartDataRaw, txid, method, email } = req.body; 
        if (!cartDataRaw) return res.status(400).send("Sepet verisi bulunamadı!");

        const cartArray = JSON.parse(cartDataRaw);
        
        let totalDbPriceUSD = 0;
        let orderItems = [];

        // Güvenlik: Toplam fiyatı yine DB'den hesaplıyoruz!
        for (let item of cartArray) {
            const product = await Watch.findById(item.id);
            if (!product) continue;
            const selectedPackage = product.Price.find(p => p.PriceTitle === item.title);
            if (selectedPackage) {
                totalDbPriceUSD += (selectedPackage.Price * item.qty);
                orderItems.push({
                    cheatId: product._id,
                    cheatName: product.CheatName,
                    packageTitle: selectedPackage.PriceTitle,
                    qty: item.qty,
                    pricePaid: selectedPackage.Price
                });
            }
        }

        if (orderItems.length === 0) return res.status(400).send("Geçersiz paket/ürün seçimi!");

        const coinGeckoMap = { ltc: 'litecoin', btc: 'bitcoin', xmr: 'monero', usdt: 'tether' };
        const cryptoId = coinGeckoMap[method];
        if (!cryptoId) return res.status(400).send("Desteklenmeyen ödeme yöntemi.");

        const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`);
        const currentCryptoPrice = data[cryptoId].usd; 
        
        // ÖDENMESİ GEREKEN TOPLAM KRİPTO MİKTARI
        const expectedCryptoAmount = totalDbPriceUSD / currentCryptoPrice;
        
        const result = await verifyPayment(txid, method, expectedCryptoAmount);
        if (!result.success) {
            return res.status(400).send(`Ödeme doğrulanamadı: ${result.message}`);
        }
        
        const existingOrder = await Order.findOne({ txid });
        if (existingOrder) return res.status(400).send("Bu TXID zaten kullanılmış!");
        
        // SİPARİŞİ VERİTABANINA KAYDET
        await Order.create({
            email, 
            items: orderItems, // !!! DİKKAT: Eski kodda tek cheatId vardı, artık ürünler dizisi var
            totalPriceUSD: totalDbPriceUSD,
            txid,
            method,
            status: 'completed'
        });
         res.send(`
            <script>localStorage.removeItem('alone_cart');</script>
            Ödemen alındı! Toplam ${orderItems.length} kalem ürün bilgileri ${email} adresine gönderilecek.
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send("Bir hata oluştu.");
    }
});
app.post('/add-cheat2', CheatUpload, async (req, res) => {
    try {
        // 1. Ana resim var mı?
        const coverUrl = req.files['coverImage'] ? req.files['coverImage'][0].path : null;
        const galleryUrls = req.files['otherImages'] 
            ? req.files['otherImages'].map(f => f.path) 
            : [];

        const newWatch = new Watch({
            name:req.body.name,
            imageUrl: coverUrl,
            caliber:req.body.caliber,
            caseMaterial:req.body.caseMaterial,
            referenceNumber:req.body.referenceNumber,     
            aciklama:req.body.aciklama,
            Photos: galleryUrls,  
            brand: req.body.categoryId
        });

        await newWatch.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Hata: " + err.message);
    }
});
app.post('/add-cheat', KategoriUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("Resim yüklenmedi!");
        }
        const coverUrl = req.file.path; 
        const yenicategory = new category({
            GameName: req.body.name,
            GameIcon: coverUrl,      
        });
        await yenicategory.save();
        res.redirect('/'); 
      } catch (err) {
        res.status(500).send("Yükleme hatası: " + err.message);
    }
});
app.post('/cheats/add-price/:id', async (req, res) => {
    const { PriceTitle, Stock, Price } = req.body;
    await Watch.findByIdAndUpdate(req.params.id, {
        $push: { Price: { PriceTitle, Stock, Price } }
    });
    res.redirect(`/cheats/${req.params.id}`);
});

// 2. Info Bloğu Ekleme
app.post('/cheats/add-info/:id', async (req, res) => {
    const { blockTitle,subTitle, items, } = req.body;
    const itemsArray = items.split(',').map(item => item.trim());
    
    await Watch.findByIdAndUpdate(req.params.id, {
        $push: { infoBlocks: { blockTitle,subTitle, items: itemsArray } }
    });
    res.redirect(`/cheats/${req.params.id}`);
}); 
app.get('/search', async (req, res) => {
    const query = req.query.q; 
    const results = await Watch.find({ 
        CheatName: { $regex: query, $options: 'i' } 
    });
    
    res.json(results);
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Nodemon aktif: http://localhost:${PORT}/ adresine git.`);
});
