const mongoose = require("mongoose");

const BoxingProgramSchema = new mongoose.Schema({
  title: String,
  description: String,
  coverImage: String,
  duration: Number, // toplam gün sayısı
});

module.exports = mongoose.model("BoxingProgram", BoxingProgramSchema);
