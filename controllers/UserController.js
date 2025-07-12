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
      return res.status(404).json({ message: "User not found." });

    const alreadyRegistered = user.programs.some(
      (p) => p.programId?.toString() === programId
    );

    if (alreadyRegistered) {
      return res
        .status(400)
        .json({ message: "You are already registered for this program." });
    }

    const programDays = await ProgramDay.find({ programId });
    if (programDays.length === 0) {
      return res.status(404).json({ message: "No days found for this program." });
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
    res.status(200).json({ message: "Program registration completed." });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "An error occurred during program registration." });
  }
};

const programIsRegistered = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found." });

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
    if (!user) return res.status(404).json({ message: "User not found" });

    // Sadece admin programlarında arama
    let program = user.programs.find(
      (p) => p.programId.toString() === programId
    );
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const day = program.days.find((d) => d.dayId.toString() === dayId);
    if (!day) return res.status(404).json({ message: "Day not found" });

    if (day.isCompleted) {
      return res.status(200).json({ message: "This day is already completed." });
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
      message: "Day completed successfully.",
      completedDay: {
        dayId,
        dayNumber: day.dayNumber,
        completedAt: day.completedAt,
        lastCompletedStep,
      },
    });
  } catch (err) {
    console.error("Day Completion Error (default):", err);
    res.status(500).json({ message: "Server error" });
  }
};

const completeUserCreatedProgramDay = async (req, res) => {
  const userId = req.user.userId;
  const { programId, dayId, lastCompletedStep = 0 } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Sadece kullanıcı tarafından oluşturulan programlarda arama
    let userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );
    if (!userCreatedProgram) {
      return res.status(404).json({ message: "Program not found" });
    }

    const day = userCreatedProgram.days.find((d) => d.dayId.toString() === dayId);
    if (!day) return res.status(404).json({ message: "Day not found" });

    if (day.isCompleted) {
      return res.status(200).json({ message: "This day is already completed." });
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
      message: "Day completed successfully.",
      completedDay: {
        dayId,
        dayNumber: day.dayNumber,
        completedAt: day.completedAt,
        lastCompletedStep,
      },
    });
  } catch (err) {
    console.error("Day Completion Error (userCreated):", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getProgramProgress = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Programı önce programs dizisinde, sonra createProgramByUser dizisinde ara
    let program = user.programs.find(
      (p) => p.programId.toString() === programId
    );
    let userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );
    const targetProgram = program || userCreatedProgram;

    if (!targetProgram) {
      return res.status(404).json({ message: "User is not registered for this program." });
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
    console.error("Could not get progress data:", error);
    console.error("İlerleme verisi alınamadı:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving program progress.",
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
      return res.status(400).json({ message: "This program is already completed" });
    }

    // Programı tamamlandı olarak işaretle
    targetProgram.isCompleted = true;

    await user.save();

    res.status(200).json({
      message: "Program completed successfully",
      programId,
      isCompleted: true,
    });
  } catch (error) {
    console.error("Program completion error:", error);
    res.status(500).json({ message: "An error occurred while completing the program" });
  }
};

const getUserStats = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    console.error("Could not get user statistics:", error);
    res.status(500).json({
      message: "An error occurred while retrieving user statistics",
      error: error.message,
    });
  }
};

const deleteUserCreatedProgram = async (req, res) => {
  const userId = req.user.userId;
  const { programId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Kullanıcının oluşturduğu programlarda arama
    const userCreatedProgram = user.createProgramByUser.find(
      (p) => p.programId.toString() === programId
    );

    if (!userCreatedProgram) {
      return res.status(404).json({ message: "Program not found or you don't have permission to delete it" });
    }

    // Programı veritabanından sil
    const deletedProgram = await BoxingProgram.findByIdAndDelete(programId);
    if (!deletedProgram) {
      return res.status(404).json({ message: "Program not found in database" });
    }

    // Program günlerini sil
    const deletedDays = await ProgramDay.deleteMany({ programId });
    console.log(`Deleted ${deletedDays.deletedCount} days for program ${programId}`);

    // Program adımlarını sil (Step modelini import etmek gerekebilir)
    const Step = require("../models/Step");
    const deletedSteps = await Step.deleteMany({ 
      dayId: { $in: deletedDays.deletedCount > 0 ? await ProgramDay.find({ programId }).distinct('_id') : [] }
    });
    console.log(`Deleted ${deletedSteps.deletedCount} steps for program ${programId}`);

    // Kullanıcının createProgramByUser listesinden programı kaldır
    user.createProgramByUser = user.createProgramByUser.filter(
      (p) => p.programId.toString() !== programId
    );

    await user.save();

    res.status(200).json({
      message: "Program deleted successfully",
      deletedProgram: {
        id: programId,
        title: deletedProgram.title,
        deletedDays: deletedDays.deletedCount,
        deletedSteps: deletedSteps.deletedCount
      }
    });

  } catch (error) {
    console.error("Program deletion error:", error);
    res.status(500).json({ 
      message: "An error occurred while deleting the program",
      error: error.message 
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
  deleteUserCreatedProgram,
};
