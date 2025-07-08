const mongoose = require("mongoose");

const StepSchema = new mongoose.Schema({
  dayId: { type: mongoose.Schema.Types.ObjectId, ref: "ProgramDay" },
  order: Number, // sırayla oynatmak için
  title: String, // örn: "Isınma", "Jab-Cross"
  description: { type: String, default: "" },
  duration: Number, // saniye cinsinden: 30, 60, 90...
  videoUrl: String,
  selectedMovements: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movement" }],
    default: [],
  },
});

module.exports = mongoose.model("Step", StepSchema);
