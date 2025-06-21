const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  registerBoxingProgram,
  programIsRegistered,
  completeDefaultProgramDay,
  completeUserCreatedProgramDay,
  getProgramProgress,
  completeProgram,
  getUserStats
} = require("../controllers/UserController");

router.get("/stats", authMiddleware, getUserStats);

router.post(
  "/:programId/registerProgram",
  authMiddleware,
  registerBoxingProgram
);
router.get("/:programId/isRegistered", authMiddleware, programIsRegistered);

router.patch("/complete-day-default", authMiddleware, completeDefaultProgramDay);

router.patch("/complete-user-created-day", authMiddleware, completeUserCreatedProgramDay);

router.patch("/:programId/complete", authMiddleware, completeProgram);

router.get("/:programId/progress", authMiddleware, getProgramProgress);

module.exports = router;
