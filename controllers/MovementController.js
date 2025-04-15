const Movement = require("../models/Movement");

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
  const { movementName, movementDesc, movementImage, movementContent } =
    req.body;
  console.log("Gelen Veriler:", req.body);

  if (!movementName) {
    return res.status(400).json({ message: "Ders adı  zorunludur." });
  }
  try {
    const newMovement = new Movement({
      movementName,
      movementDesc,
      movementImage,
      movementContent,
    });

    const savedMovement = await newMovement.save();
    console.log("Kaydedilen Hareket:", savedMovement);

    res.status(201).json(newMovement);
  } catch (error) {
    console.error("Hareket Oluşturma Hatası:", error);

    res
      .status(500)
      .json({ message: "Hareket oluşturulurken bir hata oluştu." });
  }
};

const updateMovement = async (req, res) => {
  const { id } = req.params;
  const { movementName, movementDesc, movementImage, movementContent } =
    req.body;
  try {
    const updatedMovement = await Movement.findByIdAndUpdate(
      id,
      {
        movementName,
        movementDesc,
        movementImage,
        movementContent,
      },
      { new: true } // Güncel dökümanı döndür
    );
    if (!updatedMovement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }

    res.status(200).json(updatedMovement);
  } catch (error) {
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

    res.status(200).json({ message: "Hareket başarıyla silindi." });
  } catch (error) {
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
