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
router.get("/", getAllMovements);

router.get("/:id", getMovementById);

router.post("/", authMiddleware, createMovement);

router.put("/:id", authMiddleware, updateMovement);

router.delete("/:id", authMiddleware, deleteMovement);

module.exports = router;
