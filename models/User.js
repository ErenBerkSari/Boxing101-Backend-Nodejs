const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  programs: [
    {
      programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BoxingProgram",
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
      isRegistered: {
        type: Boolean,
        default: false,
      },
      days: [
        {
          dayId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProgramDay",
          },
          isCompleted: {
            type: Boolean,
            default: false,
          },
          lastCompletedStep: {
            type: Number, // örn: step sırası
            default: 0,
          },
        },
      ],
    },
  ],
});
module.exports = mongoose.model("User", UserSchema);
