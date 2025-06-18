const BoxingProgram = require("../models/BoxingProgram");
const ProgramDay = require("../models/ProgramDay");
const Step = require("../models/Step");
const cloudinary = require("../utils/cloudinary");
const { Readable } = require("stream");
const mongoose = require("mongoose");
const User = require("../models/User");
const Movement = require("../models/Movement");

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

const createBoxingProgramByUser = async (req, res) => {
  try {
    // Kullanıcı kimlik doğrulaması - JWT token'dan userId al
    const userId = req.user?.userId; // Auth middleware'den gelen user ID

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Yetkisiz erişim. Giriş yapınız." });
    }

    // Form verilerini parse et
    const programData = JSON.parse(req.body.data);
    const { title, description, duration, days } = programData;

    // Validasyon
    if (!title || !days || !Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ message: "Eksik veya hatalı veri gönderildi." });
    }

    // Medya dosyalarını yükle ve URL'lerini topla
    const uploadedMedia = {};

    if (req.files && req.files.length > 0) {
      const mediaFiles = req.files.filter((file) => file.fieldname === "files");

      for (const file of mediaFiles) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: "boxingPrograms/userCreated/media",
                resource_type: "auto", // video ve resim için otomatik algılama
              },
              (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
              }
            );
            Readable.from(file.buffer).pipe(stream);
          });

          uploadedMedia[file.originalname] = uploadResult;
        } catch (uploadError) {
          console.error("Medya dosyası yükleme hatası:", uploadError);
        }
      }
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
                folder: "boxingPrograms/userCreated/covers",
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
      createdBy: userId, // Programı oluşturan kullanıcı
      isUserCreated: true, // Kullanıcı tarafından oluşturuldu
    });

    const savedProgram = await newProgram.save();
    console.log("Program kaydedildi, ID:", savedProgram._id);

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
        console.log(
          `Gün ${day.dayNumber} için ${day.steps.length} adım işleniyor...`
        );
        for (let i = 0; i < day.steps.length; i++) {
          const step = day.steps[i];
          let mediaUrl = "";

          // Eğer bu adıma ait medya dosyası varsa URL'ini al
          if (step.videoName && uploadedMedia[step.videoName]) {
            mediaUrl = uploadedMedia[step.videoName];
            console.log(`Adım ${i + 1} için medya URL'i bulundu: ${mediaUrl}`);
          } else {
            console.log(
              `Adım ${i + 1} için medya URL'i bulunamadı. videoName: ${
                step.videoName
              }`
            );
          }

          console.log(`Adım ${i + 1} verileri:`, {
            title: step.title,
            duration: step.duration,
            selectedMovements: step.selectedMovements,
          });

          const newStep = new Step({
            dayId: savedDay._id,
            order: i + 1,
            title: step.title || `Adım ${i + 1}`,
            duration: step.duration || 30,
            videoUrl: mediaUrl,
            selectedMovements: step.selectedMovements || [],
          });

          const savedStep = await newStep.save();
          console.log(
            `Adım kaydedildi: ${savedStep.title}, ID: ${savedStep._id}, Seçili Hareketler: ${savedStep.selectedMovements.length}`
          );
          savedSteps.push(savedStep);
        }
      } else {
        console.log(
          `Gün ${day.dayNumber} için adım bulunamadı veya geçersiz format.`
        );
      }

      savedDays.push({
        ...savedDay.toObject(),
        steps: savedSteps,
      });
    }

    // Programın days alanını güncelle
    savedProgram.days = savedDays.map((day) => day._id);
    await savedProgram.save();
    console.log("Program günleri güncellendi");

    // Kullanıcının createProgramByUser dizisine programı ekle
    const user = await User.findById(userId);
if (user) {
  // Önce bu programın zaten eklenip eklenmediğini kontrol et
  const existingProgram = user.createProgramByUser.find(
    p => p.programId.toString() === savedProgram._id.toString()
  );

  if (!existingProgram) {
    user.createProgramByUser.push({
      programId: savedProgram._id,
      isCompleted: false,
      isRegistered: true,
      completedDays: [],
      days: savedDays.map((day) => ({
        dayId: day._id,
        isCompleted: false,
        lastCompletedStep: 0,
        completedAt: null,
        newDayLockedToDate: null,
      })),
    });

    await user.save();
    console.log("Program kullanıcının createProgramByUser listesine eklendi.");
  }
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

// Kullanıcının oluşturduğu programları getiren yardımcı metod
const getUserCreatedPrograms = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Yetkisiz erişim." });
    }

    const user = await User.findById(userId).populate({
      path: "createProgramByUser.programId",
      model: "BoxingProgram",
      populate: {
        path: "days",
        model: "ProgramDay",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    // Her program için günleri ve adımları detaylı şekilde getir
    const userCreatedPrograms = await Promise.all(
      user.createProgramByUser.map(async (item) => {
        const program = item.programId.toObject();

        // Program günlerini bul
        const days = await ProgramDay.find({ programId: program._id }).sort({
          dayNumber: 1,
        });

        // Her gün için adımları bul ve hareketleri populate et
        const daysWithSteps = await Promise.all(
          days.map(async (day) => {
            const steps = await Step.find({ dayId: day._id }).sort({
              order: 1,
            });

            // Her adım için seçili hareketleri populate et
            const stepsWithMovements = await Promise.all(
              steps.map(async (step) => {
                const stepObj = step.toObject();

                // Eğer selectedMovements varsa, hareketleri getir
                if (
                  step.selectedMovements &&
                  step.selectedMovements.length > 0
                ) {
                  const movements = await Promise.all(
                    step.selectedMovements.map(async (movementId) => {
                      const movement = await Movement.findById(movementId);
                      if (movement) {
                        // İlk video içeriğini bul
                        const firstVideoContent = movement.movementContent.find(
                          (content) => content.type === "video"
                        );

                        return {
                          _id: movement._id,
                          movementName: movement.movementName,
                          movementDesc: movement.movementDesc,
                          firstVideoContent: firstVideoContent || null,
                        };
                      }
                      return null;
                    })
                  );

                  stepObj.movements = movements.filter((m) => m !== null);
                }

                return stepObj;
              })
            );

            return {
              ...day.toObject(),
              steps: stepsWithMovements,
            };
          })
        );

        return {
          ...program,
          days: daysWithSteps,
          userProgramData: {
            isCompleted: item.isCompleted,
            isRegistered: item.isRegistered,
            completedDays: item.completedDays,
            days: item.days,
          },
        };
      })
    );

    res.status(200).json({
      programs: userCreatedPrograms,
      totalCount: userCreatedPrograms.length,
    });
  } catch (err) {
    console.error("Kullanıcı programları getirme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası: " + err.message });
  }
};

const getUserRegisterPrograms = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Yetkisiz erişim." });
    }

    const user = await User.findById(userId).populate({
      path: "programs.programId",
      model: "BoxingProgram",
      populate: {
        path: "days",
        model: "ProgramDay",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    // Her program için günleri ve adımları detaylı şekilde getir
    const registeredPrograms = await Promise.all(
      user.programs
        .filter((item) => !item.programId.isUserCreated) // Sadece isUserCreated false olan programları filtrele
        .map(async (item) => {
          const program = item.programId.toObject();

          // Program günlerini bul
          const days = await ProgramDay.find({ programId: program._id }).sort({
            dayNumber: 1,
          });

          // Her gün için adımları bul ve hareketleri populate et
          const daysWithSteps = await Promise.all(
            days.map(async (day) => {
              const steps = await Step.find({ dayId: day._id }).sort({
                order: 1,
              });

              // Her adım için seçili hareketleri populate et
              const stepsWithMovements = await Promise.all(
                steps.map(async (step) => {
                  const stepObj = step.toObject();

                  // Eğer selectedMovements varsa, hareketleri getir
                  if (
                    step.selectedMovements &&
                    step.selectedMovements.length > 0
                  ) {
                    const movements = await Promise.all(
                      step.selectedMovements.map(async (movementId) => {
                        const movement = await Movement.findById(movementId);
                        if (movement) {
                          // İlk video içeriğini bul
                          const firstVideoContent =
                            movement.movementContent.find(
                              (content) => content.type === "video"
                            );

                          return {
                            _id: movement._id,
                            movementName: movement.movementName,
                            movementDesc: movement.movementDesc,
                            firstVideoContent: firstVideoContent || null,
                          };
                        }
                        return null;
                      })
                    );

                    stepObj.movements = movements.filter((m) => m !== null);
                  }

                  return stepObj;
                })
              );

              return {
                ...day.toObject(),
                steps: stepsWithMovements,
              };
            })
          );

          return {
            ...program,
            days: daysWithSteps,
            isCompleted: item.isCompleted,
            userProgramData: {
              isCompleted: item.isCompleted,
              isRegistered: item.isRegistered,
              completedDays: item.completedDays,
              days: item.days,
            },
          };
        })
    );

    res.status(200).json({
      programs: registeredPrograms,
      totalCount: registeredPrograms.length,
    });
  } catch (err) {
    console.error("Kullanıcı programları getirme hatası:", err);
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

    // Her gün için adımları bul ve hareketleri populate et
    const daysWithSteps = await Promise.all(
      days.map(async (day) => {
        const steps = await Step.find({ dayId: day._id }).sort({ order: 1 });
        console.log(`${day._id} ID'li gün için ${steps.length} adım bulundu`);

        // Her adım için seçili hareketleri populate et
        const stepsWithMovements = await Promise.all(
          steps.map(async (step) => {
            const stepObj = step.toObject();

            // Eğer selectedMovements varsa, hareketleri getir
            if (step.selectedMovements && step.selectedMovements.length > 0) {
              const movements = await Promise.all(
                step.selectedMovements.map(async (movementId) => {
                  const movement = await Movement.findById(movementId);
                  if (movement) {
                    // İlk video içeriğini bul
                    const firstVideoContent = movement.movementContent.find(
                      (content) => content.type === "video"
                    );

                    return {
                      _id: movement._id,
                      movementName: movement.movementName,
                      movementDesc: movement.movementDesc,
                      firstVideoContent: firstVideoContent || null,
                    };
                  }
                  return null;
                })
              );

              stepObj.movements = movements.filter((m) => m !== null);
            }

            return stepObj;
          })
        );

        return {
          ...day.toObject(),
          steps: stepsWithMovements,
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

const getBoxingProgramDetailsByUser = async (req, res) => {
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

const getUserCreatedAndDefaultPrograms = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Yetkisiz erişim." });
    }

    const user = await User.findById(userId)
      .populate({
        path: "programs.programId",
        model: "BoxingProgram",
        populate: {
          path: "days",
          model: "ProgramDay",
        },
      })
      .populate({
        path: "createProgramByUser.programId",
        model: "BoxingProgram",
        populate: {
          path: "days",
          model: "ProgramDay",
        },
      });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    // Her iki program dizisini birleştir
    const allUserPrograms = [
      ...user.programs.filter(
        (item) =>
          item.programId.isUserCreated === true ||
          item.programId.isUserCreated === undefined
      ),
      ...user.createProgramByUser, // Kullanıcının oluşturduğu programlar zaten user-created
    ];

    // Her program için günleri ve adımları detaylı şekilde getir
    const programs = await Promise.all(
      allUserPrograms.map(async (item) => {
        const program = item.programId.toObject();

        // Program günlerini bul
        const days = await ProgramDay.find({ programId: program._id }).sort({
          dayNumber: 1,
        });

        // Her gün için adımları bul ve hareketleri populate et
        const daysWithSteps = await Promise.all(
          days.map(async (day) => {
            const steps = await Step.find({ dayId: day._id }).sort({
              order: 1,
            });

            // Her adım için seçili hareketleri populate et
            const stepsWithMovements = await Promise.all(
              steps.map(async (step) => {
                const stepObj = step.toObject();

                // Eğer selectedMovements varsa, hareketleri getir
                if (
                  step.selectedMovements &&
                  step.selectedMovements.length > 0
                ) {
                  const movements = await Promise.all(
                    step.selectedMovements.map(async (movementId) => {
                      const movement = await Movement.findById(movementId);
                      if (movement) {
                        // İlk video içeriğini bul
                        const firstVideoContent = movement.movementContent.find(
                          (content) => content.type === "video"
                        );

                        return {
                          _id: movement._id,
                          movementName: movement.movementName,
                          movementDesc: movement.movementDesc,
                          firstVideoContent: firstVideoContent || null,
                        };
                      }
                      return null;
                    })
                  );

                  stepObj.movements = movements.filter((m) => m !== null);
                }

                return stepObj;
              })
            );

            return {
              ...day.toObject(),
              steps: stepsWithMovements,
            };
          })
        );

        return {
          ...program,
          days: daysWithSteps,
          isCompleted: item.isCompleted,
          userProgramData: {
            isCompleted: item.isCompleted,
            isRegistered: item.isRegistered,
            completedDays: item.completedDays,
            days: item.days,
          },
        };
      })
    );

    res.status(200).json({
      programs: programs,
      totalCount: programs.length,
    });
  } catch (err) {
    console.error("Kullanıcı programları getirme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası: " + err.message });
  }
};

module.exports = {
  createBoxingProgram,
  createBoxingProgramByUser,
  getBoxingPrograms,
  getBoxingProgramById,
  getBoxingProgramDetails,
  getUserCreatedPrograms,
  getBoxingProgramDetailsByUser,
  getUserRegisterPrograms,
  getUserCreatedAndDefaultPrograms,
};
