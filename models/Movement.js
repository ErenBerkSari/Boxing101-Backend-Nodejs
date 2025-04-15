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
  movementContent: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

const Movement = mongoose.model("Movement", MovementSchema);
module.exports = Movement;
