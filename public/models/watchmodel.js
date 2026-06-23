const mongoose = require("mongoose");
const watchSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    referenceNumber: { type: String, required: true, unique: true },
    caliber: String,
    caseMaterial: String,
    imageUrl: String
});

const Watch = mongoose.model('Watch', watchSchema);
