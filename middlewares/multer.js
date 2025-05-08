const multer = require("multer");

// Multer'ı belleğe kaydedecek şekilde ayarla (dosya sistemine değil)
const storage = multer.memoryStorage();

// Dosya filtreleme fonksiyonu
const fileFilter = (req, file, cb) => {
  const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const videoMimeTypes = [
    "video/mp4",
    "video/webm",
    "video/mov",
    "video/quicktime",
  ];

  if (imageMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (videoMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Geçersiz dosya türü! Sadece resim (jpeg/png/webp/gif) ve video (mp4/webm/mov) yükleyebilirsiniz."
      ),
      false
    );
  }
};

// Dosya boyut limitleri
const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB limit
};

// Multer yapılandırması
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits,
});

module.exports = upload;
