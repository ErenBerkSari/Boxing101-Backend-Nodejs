const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Token = require("../models/Token");
const dayjs = require("dayjs");

const ACCESS_TOKEN_EXPIRY = "20m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id, createdAt: Date.now() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

const register = async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ message: "Please fill in all required fields." });
  }

  // Email format kontrolü
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: "Please enter a valid email address." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, email });
    await newUser.save();

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    await Token.create({
      userId: newUser._id,
      refreshToken,
      createdAt: Date.now(),
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 20 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      userId: newUser._id,
      email,
      username: newUser.username,
      role: newUser.role,
      message: "Registration successful.",
    });
  } catch (error) {
    console.error("Sunucu hatası: ", error);
    res.status(500).json({
      message: "An error occurred. Please try again later.",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Wrong password." });

    const accessToken = generateAccessToken(user);

    let tokenDoc = await Token.findOne({ userId: user._id });
    let refreshTokenValue = tokenDoc?.refreshToken;

    const shouldGenerateNew =
      !refreshTokenValue ||
      Date.now() - new Date(tokenDoc.createdAt).getTime() >
        REFRESH_UPDATE_INTERVAL;

    if (shouldGenerateNew) {
      refreshTokenValue = generateRefreshToken(user);
      await Token.findOneAndUpdate(
        { userId: user._id },
        { refreshToken: refreshTokenValue, createdAt: Date.now() },
        { upsert: true }
      );
    }

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 20 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshTokenValue, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ 
      userId: user._id, 
      email, 
      username: user.username, 
      role: user.role,
      message: "Login successful! Welcome." 
    });
  } catch (error) {
    console.error("Sunucu hatası", error);
    res.status(500).json({
      message: "An error occurred. Please try again later.",
    });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) await Token.deleteOne({ refreshToken });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred. Please try again later.",
    });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.json({ message: "Refresh token not provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const tokenRecord = await Token.findOne({
      userId: decoded.userId,
      refreshToken,
    });
    if (!tokenRecord) {
      // Geçersiz refresh token durumunda cookie'leri temizle
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.userId);
    const newAccessToken = generateAccessToken(user);

    let newRefreshToken = refreshToken;
    if (Date.now() - decoded.createdAt > REFRESH_UPDATE_INTERVAL) {
      newRefreshToken = generateRefreshToken(user);
      await Token.findOneAndUpdate(
        { userId: user._id },
        { refreshToken: newRefreshToken, createdAt: Date.now() }
      );
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    // Access token'ı artık JSON içinde dönmek yerine cookie'ye ekleyelim
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 10 * 60 * 1000, // 10 dakika
    });

    res.json({ message: "Access token renewed." });
  } catch (error) {
    // JWT verify hatası durumunda da cookie'leri temizle
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired refresh token" });
  }
};

const extractTokenInfo = (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(400).json({ message: "Token not provided" });
  }

  try {
    // Token'ı doğrula ve bilgileri al
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Token'daki bilgileri döndür
    const { userId, role, iat, exp } = decoded;

    res.status(200).json({ userId, role, iat, exp });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const getAuthUser = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.json({
        isAuthenticated: false,
        message: "No active session found",
      });
    }

    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.json({
        isAuthenticated: false,
        message: "User not found",
      });
    }

    res.json({
      isAuthenticated: true,
      userId: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error("❌ Kullanıcı bilgileri alınırken hata:", error.message);
    res.status(500).json({
      message: "An error occurred. Please try again later.",
    });
  }
};

const getServerDate = async (req, res) => {
  res.json({ now: dayjs().toISOString() });
};

module.exports = {
  login,
  register,
  refresh,
  logout,
  extractTokenInfo,
  getAuthUser,
  getServerDate,
};
