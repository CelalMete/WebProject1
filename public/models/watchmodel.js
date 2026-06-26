const mongoose = require("mongoose");
const InfoBlockSchema = new mongoose.Schema({
    blockTitle: { type: String },  
    subTitle: { type: String },                    
    items: { type: [String], default: [] }          
});
const watchSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    name:String,
    referenceNumber: { type:Number, required: true, unique: true },
    caliber: Number,
    aciklama:String,
    caseMaterial: String,
    imageUrl: String,
    Photos:[String],
    infoBlocks: [InfoBlockSchema],
    price:Number,
});

module.exports = mongoose.model("Watch", watchSchema);
