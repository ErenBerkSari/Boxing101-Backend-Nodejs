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
      completedDays: [
        {
          dayId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProgramDay",
          },
          dayNumber: {
            type: Number,
            default: 0,
          },
          completedAt: {
            type: Date,
            default: null,
          },
        },
      ],
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
          completedAt: {
            type: Date,
            default: null,
          },
          newDayLockedToDate: {
            type: Date,
            default: null,
          },
        },
      ],
    },
  ],

  createProgramByUser: [
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
      completedDays: [
        {
          dayId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProgramDay",
          },
          dayNumber: {
            type: Number,
            default: 0,
          },
          completedAt: {
            type: Date,
            default: null,
          },
        },
      ],
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
          completedAt: {
            type: Date,
            default: null,
          },
          newDayLockedToDate: {
            type: Date,
            default: null,
          },
        },
      ],
    },
  ],
});
module.exports = mongoose.model("User", UserSchema);
