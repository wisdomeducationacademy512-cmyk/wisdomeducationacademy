// ===== EXAMS & RESULTS LOGIC =====

let currentSubjects = [];

// --- Create Exam ---
async function createExam() {
  const name = document.getElementById('examName').value.trim();
  const date = document.getElementById('examDate').value;

  if (!name) {
    alert('Exam ka naam likho.');
    return;
  }

  try {
    await db.collection('exams').add({
      name: name,
      date: date,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('examName').value = '';
    document.getElementById('examDate').value = '';
    await populateExamDropdown();
    alert('Exam created: ' + name);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function populateExamDropdown() {
  const snap = await db.collection('exams').orderBy('createdAt', 'desc').get();
  const select = document.getElementById('resultExamSelect');
  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Select Exam --</option>';
  snap.forEach(doc => {
    const e = doc.data();
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = e.name + (e.date ? ' (' + e.date + ')' : '');
    select.appendChild(opt);
  });
  select.value = currentValue;
}

async function populateResultStudentDropdown() {
  const snap = await db.collection('students').orderBy('name').get();
  const select = document.getElementById('resultStudentSelect');
  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Select Student --</option>';
  snap.forEach(doc => {
    const s = doc.data();
    const opt = document.createElement('option');
    opt.value = s.studentId;
    opt.textContent = `${s.name} (${s.studentId}) - Class ${s.class}`;
    select.appendChild(opt);
  });
  select.value = currentValue;
}

async function initExamsSection() {
  await populateExamDropdown();
  await populateResultStudentDropdown();
}

// --- Load Existing Result (agar pehle se save hai) ---
async function loadStudentResult() {
  const examId = document.getElementById('resultExamSelect').value;
  const studentId = document.getElementById('resultStudentSelect').value;

  currentSubjects = [];
  renderSubjectsList();

  if (!examId || !studentId) return;

  try {
    const doc = await db.collection('results').doc(`${examId}_${studentId}`).get();
    if (doc.exists) {
      currentSubjects = doc.data().subjects || [];
      renderSubjectsList();
    }
  } catch (error) {
    console.error('Error loading result:', error);
  }
}

// --- Subject Row Add/Remove ---
function addSubjectRow() {
  const name = document.getElementById('newSubjectName').value.trim();
  const obtained = parseFloat(document.getElementById('newSubjectObtained').value);
  const total = parseFloat(document.getElementById('newSubjectTotal').value);

  if (!name || isNaN(obtained) || isNaN(total)) {
    alert('Subject, obtained marks, aur total marks teeno bharo.');
    return;
  }

  currentSubjects.push({ name, obtained, total });
  document.getElementById('newSubjectName').value = '';
  document.getElementById('newSubjectObtained').value = '';
  document.getElementById('newSubjectTotal').value = '';
  renderSubjectsList();
}

function removeSubjectRow(index) {
  currentSubjects.splice(index, 1);
  renderSubjectsList();
}

function renderSubjectsList() {
  const container = document.getElementById('subjectsList');
  container.innerHTML = '';

  let totalObtained = 0, totalMax = 0;

  currentSubjects.forEach((sub, index) => {
    totalObtained += sub.obtained;
    totalMax += sub.total;

    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm';
    row.innerHTML = `
      <span>${sub.name}</span>
      <span class="font-semibold">${sub.obtained} / ${sub.total}</span>
      <button onclick="removeSubjectRow(${index})" class="text-red-600 hover:underline text-xs">Remove</button>
    `;
    container.appendChild(row);
  });

  const percent = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
  document.getElementById('resultTotalDisplay').textContent = `${totalObtained} / ${totalMax}`;
  document.getElementById('resultPercentDisplay').textContent = `${percent}%`;
}

// --- Save Result ---
async function saveResult() {
  const examId = document.getElementById('resultExamSelect').value;
  const studentId = document.getElementById('resultStudentSelect').value;

  if (!examId || !studentId) {
    alert('Pehle Exam aur Student select karo.');
    return;
  }
  if (currentSubjects.length === 0) {
    alert('Kam az kam ek subject add karo.');
    return;
  }

  const totalObtained = currentSubjects.reduce((sum, s) => sum + s.obtained, 0);
  const totalMax = currentSubjects.reduce((sum, s) => sum + s.total, 0);
  const percent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  const saveBtn = document.getElementById('saveResultBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    const studentDoc = await db.collection('students').doc(studentId).get();

    await db.collection('results').doc(`${examId}_${studentId}`).set({
      examId: examId,
      examName: examDoc.exists ? examDoc.data().name : '',
      studentId: studentId,
      studentName: studentDoc.exists ? studentDoc.data().name : '',
      class: studentDoc.exists ? studentDoc.data().class : '',
      subjects: currentSubjects,
      totalObtained: totalObtained,
      totalMax: totalMax,
      percentage: percent,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('✅ Result saved!');
  } catch (error) {
    alert('Error: ' + error.message);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Result';
}
