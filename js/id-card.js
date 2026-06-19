// ===== ID CARD GENERATION LOGIC =====

let currentCardType = 'student';

function switchCardType(type) {
  currentCardType = type;
  if (type === 'student') {
    document.getElementById('studentSelectWrap').classList.remove('hidden');
    document.getElementById('teacherSelectWrap').classList.add('hidden');
  } else {
    document.getElementById('studentSelectWrap').classList.add('hidden');
    document.getElementById('teacherSelectWrap').classList.remove('hidden');
  }
  document.getElementById('idCardPreview').classList.add('hidden');
}

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

    const teacherSnap = await db.collection('teachers').orderBy('name').get();
    const tSelect = document.getElementById('idCardTeacherSelect');
    tSelect.innerHTML = '<option value="">-- Select a teacher --</option>';

    teacherSnap.forEach(doc => {
      const t = doc.data();
      const option = document.createElement('option');
      option.value = t.teacherId;
      option.textContent = `${t.name} (${t.teacherId})`;
      tSelect.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading dropdown:', error);
  }
}

function drawQrCode(text) {
  const qrContainer = document.getElementById('qrCodeContainer');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: text,
    width: 110,
    height: 110
  });
}

async function generateIdCard() {
  if (currentCardType === 'student') {
    await generateStudentCard();
  } else {
    await generateTeacherCard();
  }
}

async function generateStudentCard() {
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

  document.getElementById('cardTypeLabel').textContent = 'Student ID Card';
  document.getElementById('cardName').textContent = student.name;
  document.getElementById('cardLine2Label').innerHTML = 'Class: <span>' + (student.class + (student.section ? '-' + student.section : '')) + '</span>';
  document.getElementById('cardLine3Label').innerHTML = 'Roll No: <span>' + (student.rollNumber || '-') + '</span>';
  document.getElementById('cardId').textContent = student.studentId;

  drawQrCode(student.studentId);
  document.getElementById('idCardPreview').classList.remove('hidden');
}

async function generateTeacherCard() {
  const teacherId = document.getElementById('idCardTeacherSelect').value;
  if (!teacherId) {
    alert('Pehle ek teacher select karo.');
    return;
  }

  let teacher;
  try {
    const doc = await db.collection('teachers').doc(teacherId).get();
    if (!doc.exists) {
      alert('Teacher not found.');
      return;
    }
    teacher = doc.data();
  } catch (error) {
    alert('Error loading teacher: ' + error.message);
    return;
  }

  document.getElementById('cardTypeLabel').textContent = 'Staff ID Card';
  document.getElementById('cardName').textContent = teacher.name;
  document.getElementById('cardLine2Label').innerHTML = 'Subject: <span>' + (teacher.subject || '-') + '</span>';
  document.getElementById('cardLine3Label').innerHTML = 'Phone: <span>' + teacher.phone + '</span>';
  document.getElementById('cardId').textContent = teacher.teacherId;

  drawQrCode(teacher.teacherId);
  document.getElementById('idCardPreview').classList.remove('hidden');
}
