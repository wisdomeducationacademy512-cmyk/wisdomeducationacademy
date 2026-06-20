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

  const photoWrap = document.getElementById('cardPhotoWrap');
  if (student.photoUrl) {
    document.getElementById('cardPhoto').src = student.photoUrl;
    photoWrap.classList.remove('hidden');
  } else {
    photoWrap.classList.add('hidden');
  }

  drawQrCode(student.studentId);
  document.getElementById('idCardPreview').classList.remove('hidden');
}

function printIdCard() {
  const photoWrap = document.getElementById('cardPhotoWrap');
  const photoHtml = !photoWrap.classList.contains('hidden')
    ? `<img src="${document.getElementById('cardPhoto').src}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;">`
    : '';

  const printWindow = window.open('', '_blank', 'width=400,height=500');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print ID Card</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .card { border: 2px solid #312e81; border-radius: 12px; padding: 16px; width: 300px; }
        .header { text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 10px; }
        .header p:first-child { font-weight: bold; color: #312e81; margin: 0; }
        .header p:last-child { font-size: 11px; color: #6b7280; text-transform: uppercase; margin: 2px 0 0 0; }
        .row { display: flex; gap: 14px; align-items: center; }
        .info p { margin: 2px 0; font-size: 14px; color: #374151; }
        .info p:first-child { font-weight: bold; font-size: 16px; color: #111827; }
      </style>
    </head>
    <body onload="window.print(); window.onafterprint = function(){ window.close(); }">
      <div class="card">
        <div class="header">
          <p>🏫 WISDOM EDUCATION ACADEMY</p>
          <p>${document.getElementById('cardTypeLabel').textContent}</p>
        </div>
        <div class="row">
          <div>${document.getElementById('qrCodeContainer').innerHTML}</div>
          ${photoHtml}
          <div class="info">
            <p>${document.getElementById('cardName').textContent}</p>
            <p>${document.getElementById('cardLine2Label').innerHTML}</p>
            <p>${document.getElementById('cardLine3Label').innerHTML}</p>
            <p style="font-family: monospace; font-size: 11px;">${document.getElementById('cardId').textContent}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
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
  document.getElementById('cardPhotoWrap').classList.add('hidden');

  drawQrCode(teacher.teacherId);
  document.getElementById('idCardPreview').classList.remove('hidden');
}
