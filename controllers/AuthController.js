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
      .json({ message: "Lütfen tüm gerekli alanları doldurunuz." });
  }

  // Email format kontrolü
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: "Geçerli bir email adresi giriniz." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Bu e-posta ile zaten bir kullanıcı var." });
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
      role: newUser.role,
      message: "Kayıt başarılı.",
    });
  } catch (error) {
    console.error("Sunucu hatası: ", error);
    res.status(500).json({
      message: "Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Yanlış şifre." });

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

    res.json({ userId: user._id, email, role: user.role });
  } catch (error) {
    console.error("Sunucu hatası", error);
    res.status(500).json({
      message: "Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.",
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
    res.status(200).json({ message: "Çıkış başarılı." });
  } catch (error) {
    res.status(500).json({
      message: "Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.",
    });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.json({ message: "Refresh token sağlanmadı" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const tokenRecord = await Token.findOne({
      userId: decoded.userId,
      refreshToken,
    });
    if (!tokenRecord)
      return res.status(403).json({ message: "Geçersiz refresh token" });

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

    res.json({ message: "Access token yenilendi." });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Yetkisiz: Geçersiz veya süresi dolmuş refresh token" });
  }
};

const extractTokenInfo = (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(400).json({ message: "Token sağlanmadı" });
  }

  try {
    // Token'ı doğrula ve bilgileri al
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Token'daki bilgileri döndür
    const { userId, role, iat, exp } = decoded;

    res.status(200).json({ userId, role, iat, exp });
  } catch (error) {
    return res.status(401).json({ message: "Geçersiz token" });
  }
};

const getAuthUser = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.json({
        isAuthenticated: false,
        message: "Aktif oturum bulunamadı",
      });
    }

    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.json({
        isAuthenticated: false,
        message: "Kullanıcı bulunamadı",
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
      message: "Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.",
    });
  }
};

const getServerDate = async (req, res) => {
  res.json({ today: dayjs().startOf("day").toISOString() });
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
