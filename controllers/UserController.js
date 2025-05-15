const ProgramDay = require("../models/ProgramDay");
const User = require("../models/User");

const registerBoxingProgram = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    const alreadyRegistered = user.programs.some(
      (p) => p.programId?.toString() === programId
    );

    if (alreadyRegistered) {
      return res
        .status(400)
        .json({ message: "Bu programa zaten kayıtlısınız." });
    }

    const programDays = await ProgramDay.find({ programId });
    if (programDays.length === 0) {
      return res.status(404).json({ message: "Programa ait gün bulunamadı." });
    }

    const daysWithProgress = programDays.map((day) => ({
      dayId: day._id,
      isCompleted: false,
      lastCompletedStep: 0,
    }));

    user.programs.push({
      programId,
      isCompleted: false,
      isRegistered: true,
      days: daysWithProgress,
    });

    await user.save();
    res.status(200).json({ message: "Program kaydı tamamlandı." });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    res
      .status(500)
      .json({ message: "Program kaydı sırasında bir hata oluştu." });
  }
};

const programIsRegistered = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    const program = user.programs.find(
      (p) => p.programId.toString() === programId
    );

    const isRegistered = program?.isRegistered || false;
    res.status(200).json({ isRegistered });
  } catch (error) {
    console.error("Program register check error:", error);
    res.status(500).json({
      message: "Program register status could not be verified",
      error: error.message,
    });
  }
};

const completeProgramDay = async (req, res) => {
  const userId = req.user.userId;
  const { programId, dayId, lastCompletedStep = 0 } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const program = user.programs.find(
      (p) => p.programId.toString() === programId
    );
    if (!program)
      return res.status(404).json({ message: "Program bulunamadı" });

    const day = program.days.find((d) => d.dayId.toString() === dayId);
    if (!day) return res.status(404).json({ message: "Gün bulunamadı" });

    // Gün bilgilerini güncelle
    day.isCompleted = true;
    day.lastCompletedStep = lastCompletedStep;
    day.completedAt = new Date(); // tamamlandığı zaman

    // Tüm günler tamamlandıysa programı da tamamlandı olarak işaretle
    const allDaysCompleted = program.days.every((d) => d.isCompleted);
    if (allDaysCompleted) {
      program.isCompleted = true;
    }

    await user.save();

    res.status(200).json({
      message: "Gün tamamlandı olarak işaretlendi",
      isProgramCompleted: program.isCompleted,
    });
  } catch (err) {
    console.error("Hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

const getProgramProgress = async (req, res) => {
  const userId = req.user.userId; // JWT'den alınan kullanıcı ID'si
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    const program = user.programs.find(
      (p) => p.programId.toString() === programId
    );

    if (!program) {
      return res
        .status(404)
        .json({ message: "Kullanıcı bu programa kayıtlı değil." });
    }

    const progressByDays = program.days.map((day) => ({
      dayId: day.dayId,
      isCompleted: day.isCompleted,
      lastCompletedStep: day.lastCompletedStep,
      completedAt: day.completedAt,
    }));

    res.status(200).json({ programId, progress: progressByDays });
  } catch (error) {
    console.error("İlerleme verisi alınamadı:", error);
    res.status(500).json({
      message: "Program ilerlemesi alınırken bir hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  programIsRegistered,
  registerBoxingProgram,
  completeProgramDay,
  getProgramProgress,
};
