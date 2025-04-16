const multer = require("multer");
const storage = multer.memoryStorage(); // dosyayı hafızada tutar
const upload = multer({ storage });

module.exports = upload;
