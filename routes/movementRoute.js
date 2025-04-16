const express = require("express");
const router = express.Router();
const {
  getAllMovements,
  getMovementById,
  createMovement,
  updateMovement,
  deleteMovement,
} = require("../controllers/MovementController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

router.get("/", getAllMovements);

router.get("/:id", getMovementById);

router.post("/", authMiddleware, upload.single("file"), createMovement);

router.put("/:id", authMiddleware, upload.single("file"), updateMovement);

router.delete("/:id", authMiddleware, deleteMovement);

module.exports = router;
