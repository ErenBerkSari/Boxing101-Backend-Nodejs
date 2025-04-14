const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  refreshToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: "1d" }, // Expiry time
});

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
