const express = require("express");
const router = express.Router();
const {
  createBoxingProgram,
  getBoxingPrograms,
  getBoxingProgramById,
  getBoxingProgramDetails,
} = require("../controllers/BoxingProgramController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

router.post("/", upload.any(), createBoxingProgram);

router.get("/", getBoxingPrograms);

router.get("/:id", getBoxingProgramById);

router.get("/:id/details", getBoxingProgramDetails);

module.exports = router;
