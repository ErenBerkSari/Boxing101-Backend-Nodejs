const express = require("express");
const router = express.Router();
const {
  createBoxingProgram,
  getBoxingPrograms,
  getBoxingProgramById,
  getBoxingProgramDetails,
  createBoxingProgramByUser,
  getUserCreatedPrograms,
  getUserRegisterPrograms,
  getUserCreatedAndDefaultPrograms,
} = require("../controllers/BoxingProgramController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

router.post("/", upload.any(), createBoxingProgram);
router.post(
  "/createProgramByUser",
  authMiddleware,
  upload.any(),
  createBoxingProgramByUser
);

router.get("/", getBoxingPrograms);

router.get("/getUserCreatedPrograms", authMiddleware, getUserCreatedAndDefaultPrograms);

router.get("/getUserRegisterPrograms", authMiddleware, getUserRegisterPrograms);
router.get("/:id", getBoxingProgramById);

router.get("/:id/details", getBoxingProgramDetails);

module.exports = router;
