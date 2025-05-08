const mongoose = require("mongoose");

const MovementSchema = new mongoose.Schema({
  movementName: {
    type: String,
    required: true,
  },
  movementDesc: {
    type: String,
  },
  movementImage: {
    type: String,
  },
  movementContent: [
    {
      type: { type: String, enum: ["text", "image", "video"] },
      value: String, // text tipi için içerik
      name: String, // dosya orijinal adı
      url: String, // medya URL'si
      fileId: String, // benzersiz dosya tanımlayıcı
      contentId: String, // içerik öğesi ID'si
    },
  ],
  media: [
    {
      url: { type: String },
      type: { type: String, enum: ["image", "video"] },
      fileId: { type: String }, // benzersiz dosya tanımlayıcısı
      originalName: { type: String }, // orijinal dosya adı
    },
  ],
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

const Movement = mongoose.model("Movement", MovementSchema);
module.exports = Movement;
