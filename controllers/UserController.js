const ProgramDay = require("../models/ProgramDay");
const User = require("../models/User");
const dayjs = require("dayjs");
const BoxingProgram = require("../models/BoxingProgram");

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

    // Hem programs hem de createProgramByUser dizilerinde arama
    const program = user.programs.find(
      (p) => p.programId.toString() === programId
    );
    const userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );

    const isRegistered = (program?.isRegistered || userCreatedProgram?.isRegistered) || false;
    res.status(200).json({ isRegistered });
  } catch (error) {
    console.error("Program register check error:", error);
    res.status(500).json({
      message: "Program register status could not be verified",
      error: error.message,
    });
  }
};

const completeDefaultProgramDay = async (req, res) => {
  const userId = req.user.userId;
  const { programId, dayId, lastCompletedStep = 0 } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    // Sadece admin programlarında arama
    let program = user.programs.find(
      (p) => p.programId.toString() === programId
    );
    if (!program) {
      return res.status(404).json({ message: "Program bulunamadı" });
    }

    const day = program.days.find((d) => d.dayId.toString() === dayId);
    if (!day) return res.status(404).json({ message: "Gün bulunamadı" });

    if (day.isCompleted) {
      return res.status(200).json({ message: "Bu gün zaten tamamlandı." });
    }

    day.isCompleted = true;
    day.lastCompletedStep = lastCompletedStep;
    day.completedAt = new Date();
    const unlockDate = dayjs().add(1, 'day').toDate();
    day.newDayLockedToDate = unlockDate;

    program.completedDays.push({
      dayId,
      dayNumber: day.dayNumber,
      completedAt: day.completedAt,
    });

    await user.save();

    res.status(200).json({
      message: "Gün başarıyla tamamlandı.",
      completedDay: {
        dayId,
        dayNumber: day.dayNumber,
        completedAt: day.completedAt,
        lastCompletedStep,
      },
    });
  } catch (err) {
    console.error("Gün Tamamlama Hatası (default):", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

const completeUserCreatedProgramDay = async (req, res) => {
  const userId = req.user.userId;
  const { programId, dayId, lastCompletedStep = 0 } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    // Sadece kullanıcı tarafından oluşturulan programlarda arama
    let userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );
    if (!userCreatedProgram) {
      return res.status(404).json({ message: "Program bulunamadı" });
    }

    const day = userCreatedProgram.days.find((d) => d.dayId.toString() === dayId);
    if (!day) return res.status(404).json({ message: "Gün bulunamadı" });

    if (day.isCompleted) {
      return res.status(200).json({ message: "Bu gün zaten tamamlandı." });
    }

    day.isCompleted = true;
    day.lastCompletedStep = lastCompletedStep;
    day.completedAt = new Date();
    const unlockDate = dayjs().add(1, 'day').toDate();
    day.newDayLockedToDate = unlockDate;

    userCreatedProgram.completedDays.push({
      dayId,
      dayNumber: day.dayNumber,
      completedAt: day.completedAt,
    });

    await user.save();

    res.status(200).json({
      message: "Gün başarıyla tamamlandı.",
      completedDay: {
        dayId,
        dayNumber: day.dayNumber,
        completedAt: day.completedAt,
        lastCompletedStep,
      },
    });
  } catch (err) {
    console.error("Gün Tamamlama Hatası (userCreated):", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

const getProgramProgress = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    // Programı önce programs dizisinde, sonra createProgramByUser dizisinde ara
    let program = user.programs.find(
      (p) => p.programId.toString() === programId
    );
    let userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );
    const targetProgram = program || userCreatedProgram;

    if (!targetProgram) {
      return res.status(404).json({ message: "Kullanıcı bu programa kayıtlı değil." });
    }

    // Program detaylarını getir (toplam gün sayısı için)
    const programDetails = await BoxingProgram.findById(programId);
    const totalDays = programDetails?.days?.length || 0;

    // Günlük ilerleme
    const progressByDays = targetProgram.days?.map((day) => ({
      dayId: day.dayId,
      isCompleted: day.isCompleted,
      lastCompletedStep: day.lastCompletedStep,
      completedAt: day.completedAt,
      newDayLockedToDate: day.newDayLockedToDate,
    })) || [];

    // Tamamlanan günler
    const completedDays = targetProgram.completedDays?.map((cd) => ({
      dayId: cd.dayId,
      completedAt: cd.completedAt,
    })) || [];

    // Program tamamlanma durumunu kontrol et
    const uniqueCompletedDays = new Set(completedDays.map(day => day.dayId));
    const isCompleted = totalDays > 0 && uniqueCompletedDays.size === totalDays;

    // Son tamamlanan günü bul
    const lastCompletedDay = completedDays.length > 0
      ? completedDays.reduce((latest, current) => 
          new Date(current.completedAt) > new Date(latest.completedAt) ? current : latest
        )
      : null;

    return res.status(200).json({
      programId,
      isCompleted,
      isRegistered: targetProgram.isRegistered,
      progress: progressByDays,
      completedDays,
      totalDays,
      lastCompletedAt: lastCompletedDay?.completedAt || null,
      newDayLockedToDate: lastCompletedDay 
        ? progressByDays.find(p => p.dayId === lastCompletedDay.dayId)?.newDayLockedToDate 
        : null
    });
  } catch (error) {
    console.error("İlerleme verisi alınamadı:", error);
    return res.status(500).json({
      message: "Program ilerlemesi alınırken bir hata oluştu.",
      error: error.message,
    });
  }
};

const completeProgram = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    // Normal programlarda arama
    let program = user.programs.find(
      (p) => p.programId.toString() === programId
    );

    // Kullanıcının oluşturduğu programlarda arama
    let userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );

    // Hiçbirinde bulunamadıysa hata ver
    if (!program && !userCreatedProgram) {
      return res.status(404).json({ message: "Program bulunamadı" });
    }

    // Hangi program tipinde çalışıyoruz
    const targetProgram = program || userCreatedProgram;

    // Program zaten tamamlanmışsa hata ver
    if (targetProgram.isCompleted) {
      return res.status(400).json({ message: "Bu program zaten tamamlanmış" });
    }

    // Programı tamamlandı olarak işaretle
    targetProgram.isCompleted = true;

    await user.save();

    res.status(200).json({
      message: "Program başarıyla tamamlandı",
      programId,
      isCompleted: true,
    });
  } catch (error) {
    console.error("Program tamamlama hatası:", error);
    res.status(500).json({ message: "Program tamamlanırken bir hata oluştu" });
  }
};

const getUserStats = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // Normal programlardaki istatistikler
    const registeredProgramsCount = user.programs.length;
    const completedProgramsCount = user.programs.filter(
      (p) => p.isCompleted
    ).length;

    // Kullanıcının oluşturduğu programlardaki istatistikler
    const userCreatedProgramsCount = user.createProgramByUser.length;
    const userCreatedCompletedProgramsCount = user.createProgramByUser.filter(
      (p) => p.isCompleted
    ).length;

    // Toplam istatistikler
    const totalProgramsCount =
      registeredProgramsCount + userCreatedProgramsCount;
    const totalCompletedProgramsCount =
      completedProgramsCount + userCreatedCompletedProgramsCount;

    res.status(200).json({
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
      stats: {
        totalPrograms: totalProgramsCount,
        totalCompletedPrograms: totalCompletedProgramsCount,
        registeredPrograms: registeredProgramsCount,
        completedRegisteredPrograms: completedProgramsCount,
        userCreatedPrograms: userCreatedProgramsCount,
        completedUserCreatedPrograms: userCreatedCompletedProgramsCount,
      },
    });
  } catch (error) {
    console.error("Kullanıcı istatistikleri alınamadı:", error);
    res.status(500).json({
      message: "Kullanıcı istatistikleri alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

module.exports = {
  programIsRegistered,
  registerBoxingProgram,
  completeDefaultProgramDay,
  completeUserCreatedProgramDay,
  getProgramProgress,
  completeProgram,
  getUserStats,
};
