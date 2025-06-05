const mongoose = require("mongoose");

const BoxingProgramSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Admin programları için null olacak
    },
    isUserCreated: {
      type: Boolean,
      default: false, // Admin programları false, kullanıcı programları true
    },
    title: String,
    description: String,
    coverImage: String,
    duration: Number, // toplam gün sayısı
    days: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramDay"
    }]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BoxingProgram", BoxingProgramSchema);
