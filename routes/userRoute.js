const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  registerBoxingProgram,
  programIsRegistered,
  completeProgramDay,
  getProgramProgress,
} = require("../controllers/UserController");

router.post(
  "/:programId/registerProgram",
  authMiddleware,
  registerBoxingProgram
);
router.get("/:programId/isRegistered", authMiddleware, programIsRegistered);

router.patch("/complete-day", authMiddleware, completeProgramDay);

router.get("/:programId/progress", authMiddleware, getProgramProgress);

module.exports = router;
