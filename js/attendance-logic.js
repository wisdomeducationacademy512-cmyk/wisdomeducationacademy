// ===== SHARED ATTENDANCE LOGIC =====
// Yeh file Gate Scanner aur Admin Dashboard dono use karte hain

// Settings Firestore se load karta hai
async function getAttendanceSettings() {
  const doc = await db.collection('settings').doc('attendance').get();
  if (!doc.exists) return null;
  return doc.data();
}

// Aaj ki date ke hisaab se decide karta hai Summer ya Winter timing active hai
function getActiveTiming(settings, todayDate) {
  if (!settings) return null;

  const today = todayDate || new Date().toISOString().split('T')[0];

  const inRange = (start, end) => {
    if (!start || !end) return false;
    return today >= start && today <= end;
  };

  if (inRange(settings.summerStartDate, settings.summerEndDate)) {
    return {
      season: 'Summer',
      startTime: settings.summerStartTime,
      endTime: settings.summerEndTime
    };
  }

  if (inRange(settings.winterStartDate, settings.winterEndDate)) {
    return {
      season: 'Winter',
      startTime: settings.winterStartTime,
      endTime: settings.winterEndTime
    };
  }

  return null; // koi season match nahi hua - admin ne abhi set nahi kiya
}

// Scan time ko start time + grace period se compare karke status decide karta hai
function calculateAttendanceStatus(scanTime, startTimeStr, graceMinutes) {
  if (!startTimeStr) return 'present'; // agar timing set nahi hai, default present

  const [startH, startM] = startTimeStr.split(':').map(Number);
  const startDate = new Date(scanTime);
  startDate.setHours(startH, startM, 0, 0);

  const graceDate = new Date(startDate.getTime() + (graceMinutes || 0) * 60000);

  return scanTime <= graceDate ? 'present' : 'late';
}
