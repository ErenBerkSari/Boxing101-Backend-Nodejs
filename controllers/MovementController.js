const Movement = require("../models/Movement");
const cloudinary = require("../utils/cloudinary");

const extractPublicId = (url) => {
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  return filename.split(".")[0]; // abc123.jpg -> abc123
};

const getAllMovements = async (req, res) => {
  try {
    const movements = await Movement.find().sort("-createdAt");

    res.status(200).json(movements);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Hareketler yüklenirken bir hata oluştu." });
  }
};

const getMovementById = async (req, res) => {
  const { id } = req.params;
  console.log("Gelen ID:", id); // ID kontrolü

  try {
    const movement = await Movement.findById(id);
    if (!movement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }
    res.status(200).json(movement);
  } catch (error) {
    res.status(500).json({ message: "Hareket getirilirken bir hata oluştu." });
  }
};

const createMovement = async (req, res) => {
  try {
    const { movementName, movementDesc, movementContent } = req.body;

    if (!movementName) {
      return res.status(400).json({ message: "Ders adı zorunludur." });
    }

    let movementImageUrl = null;

    // Dosya yüklendiyse Cloudinary'e gönder
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary yükleme hatası:", error);
            return res.status(500).json({ message: "Görsel yüklenemedi." });
          }

          movementImageUrl = result.secure_url;

          // Kayıt
          const newMovement = new Movement({
            movementName,
            movementDesc,
            movementImage: movementImageUrl,
            movementContent: JSON.parse(movementContent), // eğer JSON ise
          });

          const savedMovement = await newMovement.save();
          res.status(201).json(savedMovement);
        }
      );

      // upload_stream'e veri gönderiyoruz
      result.end(req.file.buffer);
    } else {
      // Dosya yoksa direkt kayıt
      const newMovement = new Movement({
        movementName,
        movementDesc,
        movementImage: null,
        movementContent: JSON.parse(movementContent),
      });

      const savedMovement = await newMovement.save();
      res.status(201).json(savedMovement);
    }
  } catch (error) {
    console.error("Hareket Oluşturma Hatası:", error);
    res.status(500).json({ message: "Hareket oluşturulurken hata oluştu." });
  }
};

const updateMovement = async (req, res) => {
  const { id } = req.params;
  const { movementName, movementDesc, movementContent } = req.body;

  try {
    let updatedFields = {
      movementName,
      movementDesc,
    };

    // Yeni görsel yüklendiyse
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      updatedFields.movementImage = result.secure_url;
    }

    // İçerik varsa ve string geldiyse parse et
    if (movementContent) {
      updatedFields.movementContent =
        typeof movementContent === "string"
          ? JSON.parse(movementContent)
          : movementContent;
    }

    const updatedMovement = await Movement.findByIdAndUpdate(
      id,
      updatedFields,
      {
        new: true,
      }
    );

    if (!updatedMovement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }

    res.status(200).json(updatedMovement);
  } catch (error) {
    console.error("Güncelleme hatası:", error);
    res
      .status(500)
      .json({ message: "Hareket güncellenirken bir hata oluştu." });
  }
};

const deleteMovement = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMovement = await Movement.findByIdAndDelete(id);

    if (!deletedMovement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }

    const imageUrl = deletedMovement.movementImage;
    if (imageUrl) {
      const publicId = extractPublicId(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }

    res.status(200).json({ message: "Hareket başarıyla silindi." });
  } catch (error) {
    console.error("Silme hatası:", error);
    res.status(500).json({ message: "Hareket silinirken bir hata oluştu." });
  }
};

module.exports = {
  getAllMovements,
  getMovementById,
  createMovement,
  updateMovement,
  deleteMovement,
};
