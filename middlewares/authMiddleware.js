const jwt = require("jsonwebtoken");
const Token = require("../models/Token");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Yetkilendirme gerekli: Token eksik" });
    }

    try {
      // Access token'ı doğrula
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      if (process.env.NODE_ENV === "development") {
        console.log("Authenticated User:", req.user);
      }

      next();
    } catch (tokenError) {
      // Token süresi dolmuşsa refresh token ile yenile
      if (tokenError.name === "TokenExpiredError") {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
          return res.status(401).json({ message: "Yetkilendirme gerekli" });
        }

        // Refresh token'ın son yenileme zamanını kontrol et
        const tokenRecord = await Token.findOne({
          refreshToken,
        });

        if (!tokenRecord) {
          return res.status(401).json({ message: "Geçersiz yenileme tokeni" });
        }

        // Son 1 dakika içinde yenileme yapılmışsa, döngüye girmemek için hata döndür
        const lastRefreshTime = new Date(tokenRecord.createdAt).getTime();
        const now = Date.now();
        if (now - lastRefreshTime < 60000) { // 1 dakika
          return res.status(401).json({ message: "Çok sık token yenileme isteği" });
        }

        try {
          // Refresh token'ı doğrula
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
          );

          // Kullanıcıyı bul
          const user = await User.findById(refreshDecoded.userId);

          if (!user) {
            return res.status(401).json({ message: "Kullanıcı bulunamadı" });
          }

          // Yeni access token oluştur
          const newAccessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "20m" }
          );

          // Yeni access token'ı cookie'ye ekle
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 20 * 60 * 1000,
          });

          // Token kaydını güncelle
          await Token.findOneAndUpdate(
            { refreshToken },
            { createdAt: now }
          );

          // Güncellenmiş kullanıcı bilgilerini ata
          req.user = {
            userId: user._id,
            role: user.role,
          };

          next();
        } catch (refreshError) {
          return res.status(401).json({ message: "Yetkilendirme başarısız" });
        }
      } else {
        return res.status(401).json({ message: "Geçersiz token" });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: "Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz." });
  }
};

module.exports = authMiddleware;
