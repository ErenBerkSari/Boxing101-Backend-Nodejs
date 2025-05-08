const multer = require("multer");

// Multer'ı sadece belleğe kaydedecek şekilde ayarla
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
