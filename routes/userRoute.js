const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  registerBoxingProgram,
  programIsRegistered,
} = require("../controllers/UserController");

router.post(
  "/:programId/registerProgram",
  authMiddleware,
  registerBoxingProgram
);
router.get("/:programId/isRegistered", authMiddleware, programIsRegistered);

module.exports = router;
