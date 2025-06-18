const calculateProgramTotalDuration = (days) => {
  if (!Array.isArray(days)) return 0;
  return days.reduce((total, day) => {
    const dayDuration = calculateTotalDuration(day.steps || []);
    return total + dayDuration;
  }, 0);
};

// Progress verisini doğru şekilde al
const progressData = progress?.progress || [];
const lastCompleted = Array.isArray(progressData)
  ? [...progressData].reverse().find((item) => item.isCompleted)
  : null;

const lockedToDate = lastCompleted?.newDayLockedToDate;
// Yükleme durumu kontrolü
const programIsCompleted = progress.isCompleted;
console.log("progress", progress);
console.log("serverDate:", serverDate);
console.log("lockedToDate:", lockedToDate); 