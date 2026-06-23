const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const KategoriStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'webproject1/kategoriler', 
    allowed_formats: ['jpg', 'png', 'webp'],
    public_id: (req, file) => `kat_${Date.now()}` 
  }
});
const CheatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const cheatName = req.body.name 
      ? req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
      : 'genel';
    
    const temizDosyaAdi = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]+/g, '_');

    return {
      folder: `webproject1/cheats/${cheatName}`, 
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: `${Date.now()}_${temizDosyaAdi}`
    };
  }
});

const KategoriUpload = multer({ storage: KategoriStorage }).single('coverImage');

const CheatUpload = multer({ storage: CheatStorage }).fields([
  { name: 'coverImage', maxCount: 1 }, 
  { name: 'otherImages', maxCount: 5 }
]);

module.exports = { KategoriUpload, CheatUpload };