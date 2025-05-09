const BoxingProgram = require("../models/BoxingProgram");
const ProgramDay = require("../models/ProgramDay");
const Step = require("../models/Step");
const cloudinary = require("../utils/cloudinary");
const { Readable } = require("stream");
const mongoose = require("mongoose");

const createBoxingProgram = async (req, res) => {
  try {
    // Form verilerini parse et
    const programData = JSON.parse(req.body.data);
    const { title, description, duration, days } = programData;

    // Validasyon
    if (!title || !days || !Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ message: "Eksik veya hatalı veri gönderildi." });
    }

    // Kapak görseli
    let coverImageUrl = null;
    if (req.files && req.files.length > 0) {
      const coverFile = req.files.find((file) => file.fieldname === "cover");

      if (coverFile) {
        try {
          const uploadCover = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: "boxingPrograms/covers",
                resource_type: "image",
              },
              (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
              }
            );
            Readable.from(coverFile.buffer).pipe(stream);
          });
          coverImageUrl = uploadCover;
        } catch (uploadError) {
          console.error("Kapak görsel yükleme hatası:", uploadError);
        }
      }
    }

    // Program oluşturma
    const newProgram = new BoxingProgram({
      title,
      description,
      duration,
      coverImage: coverImageUrl,
    });

    const savedProgram = await newProgram.save();
    console.log("Program kaydedildi, ID:", savedProgram._id);

    // Adım medya dosyalarını yükleme
    const contentFiles =
      req.files?.filter((f) => f.fieldname === "files") || [];
    const uploadedMedia = {};

    for (const file of contentFiles) {
      const fileName = file.originalname;
      const isImage = file.mimetype.startsWith("image");

      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "boxingPrograms/steps",
              resource_type: isImage ? "image" : "video",
            },
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
            }
          );
          Readable.from(file.buffer).pipe(stream);
        });

        uploadedMedia[fileName] = result.secure_url;
        console.log(`Medya yüklendi: ${fileName} -> ${result.secure_url}`);
      } catch (mediaUploadError) {
        console.error(
          `${fileName} dosyası yüklenirken hata:`,
          mediaUploadError
        );
      }
    }

    // Günler ve Adımların Kaydedilmesi
    const savedDays = [];

    for (const day of days) {
      const newDay = new ProgramDay({
        programId: savedProgram._id,
        dayNumber: day.dayNumber,
        title: day.title || `Gün ${day.dayNumber}`,
        description: day.description || "",
      });

      const savedDay = await newDay.save();
      console.log(`Gün kaydedildi: ${savedDay.title}, ID: ${savedDay._id}`);

      const savedSteps = [];

      // Her bir gün içindeki adımları kaydet
      if (day.steps && Array.isArray(day.steps)) {
        for (let i = 0; i < day.steps.length; i++) {
          const step = day.steps[i];
          let mediaUrl = "";

          // Eğer bu adıma ait medya dosyası varsa URL'ini al
          if (step.videoName && uploadedMedia[step.videoName]) {
            mediaUrl = uploadedMedia[step.videoName];
          }

          const newStep = new Step({
            dayId: savedDay._id,
            order: i + 1,
            title: step.title || `Adım ${i + 1}`,
            duration: step.duration || 30,
            videoUrl: mediaUrl,
          });

          const savedStep = await newStep.save();
          console.log(
            `Adım kaydedildi: ${savedStep.title}, ID: ${savedStep._id}`
          );
          savedSteps.push(savedStep);
        }
      }

      savedDays.push({
        ...savedDay.toObject(),
        steps: savedSteps,
      });
    }

    res.status(201).json({
      message: "Program başarıyla oluşturuldu.",
      program: {
        ...savedProgram.toObject(),
        days: savedDays,
      },
    });
  } catch (err) {
    console.error("Program oluşturma hatası:", err);
    res.status(500).json({ message: "Sunucu hatası: " + err.message });
  }
};

// Programları listele
const getBoxingPrograms = async (req, res) => {
  try {
    const programs = await BoxingProgram.find({}).sort({ _id: -1 });
    res.status(200).json(programs);
  } catch (error) {
    console.error("Programları getirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// Program detayı getir (günler ve adımlarla birlikte)
const getBoxingProgramById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Geçersiz program ID'si." });
    }

    const program = await BoxingProgram.findById(id);

    if (!program) {
      return res.status(404).json({ message: "Program bulunamadı." });
    }

    // Program günlerini bul
    const days = await ProgramDay.find({ programId: id }).sort({
      dayNumber: 1,
    });
    console.log(`${id} ID'li program için ${days.length} gün bulundu`);

    // Her gün için adımları bul
    const daysWithSteps = await Promise.all(
      days.map(async (day) => {
        const steps = await Step.find({ dayId: day._id }).sort({ order: 1 });
        console.log(`${day._id} ID'li gün için ${steps.length} adım bulundu`);
        return {
          ...day.toObject(),
          steps,
        };
      })
    );

    res.status(200).json({
      ...program.toObject(),
      days: daysWithSteps,
    });
  } catch (error) {
    console.error("Program detayı getirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası: " + error.message });
  }
};

// Program detayını düz SQL benzeri bir sorguyla getirelim (alternatif yöntem)
const getBoxingProgramDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Geçersiz program ID'si." });
    }

    // Program bilgilerini alalım
    const program = await BoxingProgram.findById(id);

    if (!program) {
      return res.status(404).json({ message: "Program bulunamadı." });
    }

    // Agregasyon pipeline kullanarak ilişkili tüm verileri tek sorguda alalım
    const programWithDays = await ProgramDay.aggregate([
      // Programa ait günleri filtreleyelim
      { $match: { programId: mongoose.Types.ObjectId(id) } },
      // Günleri sıralayalım
      { $sort: { dayNumber: 1 } },
      // Her gün için adımları getirelim
      {
        $lookup: {
          from: "steps",
          localField: "_id",
          foreignField: "dayId",
          as: "steps",
        },
      },
      // Adımları sıralayalım
      {
        $addFields: {
          steps: { $sortArray: { input: "$steps", sortBy: { order: 1 } } },
        },
      },
    ]);

    console.log(`Agregasyon sonucu ${programWithDays.length} gün bulundu`);

    res.status(200).json({
      ...program.toObject(),
      days: programWithDays,
    });
  } catch (error) {
    console.error("Program detayı getirme hatası (agregasyon):", error);
    res.status(500).json({ message: "Sunucu hatası: " + error.message });
  }
};

module.exports = {
  createBoxingProgram,
  getBoxingPrograms,
  getBoxingProgramById,
  getBoxingProgramDetails,
};
