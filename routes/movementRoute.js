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

router.post("/", upload.any(), createMovement);

router.patch("/:id", upload.any(), updateMovement);

router.delete("/:id", deleteMovement);

module.exports = router;
