const express = require("express");
const {
  login,
  register,
  logout,
  refresh,
  getAuthUser,
} = require("../controllers/AuthController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/getAuthUser", getAuthUser);

module.exports = router;
