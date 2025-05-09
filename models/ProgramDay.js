const mongoose = require("mongoose");

const ProgramDaySchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: "BoxingProgram" },
  dayNumber: Number,
  title: String,
  description: String, // o günün genel açıklaması
});

module.exports = mongoose.model("ProgramDay", ProgramDaySchema);
