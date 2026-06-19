// ===== ID CARD GENERATION LOGIC =====

async function loadIdCardStudentDropdown() {
  try {
    const snap = await db.collection('students').orderBy('name').get();
    const select = document.getElementById('idCardStudentSelect');
    select.innerHTML = '<option value="">-- Select a student --</option>';

    snap.forEach(doc => {
      const s = doc.data();
      const option = document.createElement('option');
      option.value = s.studentId;
      option.textContent = `${s.name} (${s.studentId}) - Class ${s.class}${s.section ? '-' + s.section : ''}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading dropdown:', error);
  }
}

async function generateIdCard() {
  const studentId = document.getElementById('idCardStudentSelect').value;
  if (!studentId) {
    alert('Pehle ek student select karo.');
    return;
  }

  let student;
  try {
    const doc = await db.collection('students').doc(studentId).get();
    if (!doc.exists) {
      alert('Student not found.');
      return;
    }
    student = doc.data();
  } catch (error) {
    alert('Error loading student: ' + error.message);
    return;
  }

  document.getElementById('cardName').textContent = student.name;
  document.getElementById('cardClass').textContent = student.class + (student.section ? '-' + student.section : '');
  document.getElementById('cardRoll').textContent = student.rollNumber || '-';
  document.getElementById('cardId').textContent = student.studentId;

  const qrContainer = document.getElementById('qrCodeContainer');
  qrContainer.innerHTML = '';
  const canvas = document.createElement('canvas');
  qrContainer.appendChild(canvas);

  // QR code mein sirf Student ID encode karte hain — gate scanner isay read karega
  QRCode.toCanvas(canvas, student.studentId, { width: 110, margin: 1 }, function (error) {
    if (error) console.error(error);
  });

  document.getElementById('idCardPreview').classList.remove('hidden');
}
