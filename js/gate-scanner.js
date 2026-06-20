// ===== GATE SCANNER LOGIC =====

let html5QrCode = null;
let isProcessingScan = false;
let cachedSettings = null;
let countsUnsubscribe = null;

// --- Auth Guard: sirf Gate role hi yahan aa sake ---
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'gate') {
    alert('Access denied. Gate scanner accounts only.');
    await auth.signOut();
    window.location.href = '../index.html';
    return;
  }

  loadSelectedGate();
  cachedSettings = await getAttendanceSettings();
  startScanner();
  watchTodayCounts();
});

function logout() {
  auth.signOut().then(() => {
    window.location.href = '../index.html';
  });
}

// --- Gate Selection (localStorage mein save hota hai, isi device pe yaad rahega) ---
function loadSelectedGate() {
  const saved = localStorage.getItem('selectedGate');
  if (saved) document.getElementById('gateSelect').value = saved;
}
function saveSelectedGate() {
  localStorage.setItem('selectedGate', document.getElementById('gateSelect').value);
  watchTodayCounts();
}
function getSelectedGate() {
  return document.getElementById('gateSelect').value;
}

// --- Camera Switch (Front/Back) ---
function getSavedFacingMode() {
  return localStorage.getItem('cameraFacingMode') || 'environment';
}

async function switchCamera() {
  const current = getSavedFacingMode();
  const next = current === 'environment' ? 'user' : 'environment';
  localStorage.setItem('cameraFacingMode', next);

  document.getElementById('scannerStatus').textContent = 'Camera switch ho rahi hai...';

  if (html5QrCode) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (e) { /* ignore agar already stopped hai */ }
  }

  startScanner();
}

// --- Camera Scanner Start ---
function startScanner() {
  html5QrCode = new Html5Qrcode("qrReader");
  const config = { fps: 10, qrbox: { width: 230, height: 230 } };

  html5QrCode.start(
    { facingMode: getSavedFacingMode() },
    config,
    onScanSuccess,
    () => { /* scan errors ignore karo, yeh normal hai jab tak code na mile */ }
  ).then(() => {
    document.getElementById('scannerStatus').textContent = 'Card scan karne ke liye saamne karo';
  }).catch((err) => {
    document.getElementById('scannerStatus').textContent = '❌ Camera access nahi mil saka. Permission allow karo.';
    console.error(err);
  });
}

// --- QR Scan Hone Par ---
async function onScanSuccess(decodedText) {
  if (isProcessingScan) return; // ek waqt mein sirf ek scan process ho
  isProcessingScan = true;

  const personId = decodedText.trim();
  document.getElementById('scannerStatus').textContent = 'Processing...';

  try {
    await processAttendance(personId);
  } catch (error) {
    console.error(error);
    showResult('❌', '', 'Error', error.message, 'bg-red-900');
  }

  // 2.5 second baad dobara scan ke liye ready
  setTimeout(() => {
    isProcessingScan = false;
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('scannerStatus').textContent = 'Card scan karne ke liye saamne karo';
  }, 2500);
}

// --- Attendance Process Karne Ka Core Logic ---
async function processAttendance(personId) {
  const today = new Date().toISOString().split('T')[0];
  const attendanceDocId = `${today}_${personId}`;

  // Step 1: Check karo aaj already scan ho chuka hai kya
  const existingDoc = await db.collection('attendance').doc(attendanceDocId).get();
  if (existingDoc.exists) {
    const d = existingDoc.data();
    showResult('ℹ️', d.photoUrl, d.name, `Already marked ${d.status} today at ${d.timeDisplay}`, 'bg-blue-900', d.status);
    return;
  }

  // Step 2: Student mein dhundo, phir Teacher mein
  let person = null;
  let type = null;

  const studentDoc = await db.collection('students').doc(personId).get();
  if (studentDoc.exists) {
    person = studentDoc.data();
    type = 'student';
  } else {
    const teacherDoc = await db.collection('teachers').doc(personId).get();
    if (teacherDoc.exists) {
      person = teacherDoc.data();
      type = 'teacher';
    }
  }

  if (!person) {
    showResult('❌', null, 'Unknown ID', 'Yeh ID system mein nahi mili: ' + personId, 'bg-red-900');
    return;
  }

  // Step 3: Status calculate karo (Present ya Late) timing settings ke hisaab se
  const now = new Date();
  const timing = getActiveTiming(cachedSettings, today);
  let status = 'present';

  if (timing && timing.startTime) {
    status = calculateAttendanceStatus(now, timing.startTime, cachedSettings.lateGraceMinutes || 0);
  }

  const timeDisplay = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  // Step 4: Firestore mein save karo
  await db.collection('attendance').doc(attendanceDocId).set({
    personId: personId,
    type: type,
    name: person.name,
    class: person.class || null,
    photoUrl: person.photoUrl || null,
    date: today,
    scanTimeMs: now.getTime(),
    timeDisplay: timeDisplay,
    gate: getSelectedGate(),
    status: status,
    markedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const detail = type === 'student'
    ? `Class ${person.class}${person.section ? '-' + person.section : ''}`
    : (person.subject || 'Teacher');

  showResult(status === 'present' ? '✅' : '⏰', person.photoUrl, person.name, detail, status === 'present' ? 'bg-green-900' : 'bg-yellow-900', status);
}

// --- Result Card Dikhana ---
function showResult(icon, photoUrl, name, detail, bgClass, status) {
  const card = document.getElementById('resultCard');
  card.className = 'rounded-xl p-5 mb-4 text-center ' + bgClass;

  document.getElementById('resultIcon').textContent = icon;

  const photoDiv = document.getElementById('resultPhoto');
  if (photoUrl) {
    photoDiv.innerHTML = `<img src="${photoUrl}" class="w-16 h-16 rounded-full object-cover mx-auto border-2 border-white">`;
    photoDiv.classList.remove('hidden');
  } else {
    photoDiv.classList.add('hidden');
  }

  document.getElementById('resultName').textContent = name;
  document.getElementById('resultDetail').textContent = detail;
  document.getElementById('resultStatus').textContent = status ? status.toUpperCase() : '';
  document.getElementById('resultTime').textContent = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  card.classList.remove('hidden');
}

// --- Aaj Is Gate Pe Kitne Scan Hue (Live Count) ---
function watchTodayCounts() {
  if (countsUnsubscribe) countsUnsubscribe();

  const today = new Date().toISOString().split('T')[0];
  const gate = getSelectedGate();

  countsUnsubscribe = db.collection('attendance')
    .where('date', '==', today)
    .where('gate', '==', gate)
    .onSnapshot((snap) => {
      let total = 0;
      let late = 0;
      snap.forEach(doc => {
        total++;
        if (doc.data().status === 'late') late++;
      });
      document.getElementById('todayScanCount').textContent = total;
      document.getElementById('todayLateCount').textContent = late;
    });
}
