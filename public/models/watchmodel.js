const mongoose = require("mongoose");

const InfoBlockSchema = new mongoose.Schema({
    blockTitle: { type: String },  
    subTitle: { type: String },                    
    items: { type: [String], default: [] }          
});

const watchSchema = new mongoose.Schema({
    // --- Legacy Özellikler > ---
    brand: { type: String },
    name: String,
    referenceNumber: { type: String }, 
    caliber: String,                   
    aciklama: String,
    caseMaterial: String,
    imageUrl: String,
    Photos: [String],
    infoBlocks: [InfoBlockSchema],
    price: Number,

    // --- RapidAPI Replication Engine Mirror Keys ---
    watchId: { type: Number, unique: true, sparse: true }, // sparse allows legacy items without an API ID
    makeName: { type: String },
    modelName: { type: String },
    familyName: { type: String },
    yearProducedName: { type: String },
    limitedName: { type: String },
    movementName: { type: String },
    functionName: { type: String },
    priceInEuro: { type: String },
    reference: { type: String },
    watchImageName: { type: String }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("Watch", watchSchema);