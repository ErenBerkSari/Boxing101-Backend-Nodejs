const express = require("express");
const {
  login,
  register,
  logout,
  refresh,
  getAuthUser,
  getServerDate,
} = require("../controllers/AuthController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/getAuthUser", authMiddleware, getAuthUser);
router.get("/getServerDate", authMiddleware, getServerDate);

module.exports = router;
