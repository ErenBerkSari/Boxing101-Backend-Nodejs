const jwt = require("jsonwebtoken");
const Token = require("../models/Token");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized, token missing" });
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
          return res.status(401).json({ message: "Authentication required" });
        }

        try {
          // Refresh token'ı doğrula
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
          );

          // Token kayıtlarını kontrol et
          const tokenRecord = await Token.findOne({
            userId: refreshDecoded.userId,
            refreshToken,
          });

          if (!tokenRecord) {
            return res.status(401).json({ message: "Invalid refresh token" });
          }

          // Kullanıcıyı bul
          const user = await User.findById(refreshDecoded.userId);

          if (!user) {
            return res.status(401).json({ message: "User not found" });
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

          // Güncellenmiş kullanıcı bilgilerini ata
          req.user = {
            userId: user._id,
            role: user.role,
          };

          next();
        } catch (refreshError) {
          return res.status(401).json({ message: "Authentication failed" });
        }
      } else {
        return res.status(401).json({ message: "Invalid token" });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = authMiddleware;
