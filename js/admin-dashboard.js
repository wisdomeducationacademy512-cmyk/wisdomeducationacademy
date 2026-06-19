// ===== ADMIN DASHBOARD LOGIC =====

// --- Auth Guard: sirf admin hi yahan aa sake ---
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    alert('Access denied. Admins only.');
    await auth.signOut();
    window.location.href = '../index.html';
    return;
  }
  loadOverviewStats();
  loadStudentsList();
});

// --- Section Switching ---
function showSection(sectionName) {
  document.getElementById('overview-section').classList.add('hidden');
  document.getElementById('students-section').classList.add('hidden');
  document.getElementById('addStudent-section').classList.add('hidden');
  document.getElementById(sectionName + '-section').classList.remove('hidden');
}

// --- Logout ---
function logout() {
  auth.signOut().then(() => {
    window.location.href = '../index.html';
  });
}

// --- Load Overview Stats ---
async function loadOverviewStats() {
  try {
    const studentsSnap = await db.collection('students').get();
    document.getElementById('totalStudents').textContent = studentsSnap.size;

    const teachersSnap = await db.collection('teachers').get();
    document.getElementById('totalTeachers').textContent = teachersSnap.size;

    // Today's attendance (placeholder - QR system will populate this later)
    const today = new Date().toISOString().split('T')[0];
    const attendanceSnap = await db.collection('attendance')
      .where('date', '==', today)
      .get();

    let present = 0;
    attendanceSnap.forEach(doc => {
      if (doc.data().status === 'present' || doc.data().status === 'late') present++;
    });

    document.getElementById('presentToday').textContent = present;
    document.getElementById('absentToday').textContent = Math.max(studentsSnap.size - present, 0);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// --- Open Edit Modal ---
function openEditModal(studentId) {
  const student = studentsCache[studentId];
  if (!student) return;

  document.getElementById('editStudentId').value = student.studentId;
  document.getElementById('editName').value = student.name || '';
  document.getElementById('editClass').value = student.class || '';
  document.getElementById('editSection').value = student.section || '';
  document.getElementById('editRoll').value = student.rollNumber || '';
  document.getElementById('editParentName').value = student.parentName || '';
  document.getElementById('editParentPhone').value = student.parentPhone || '';
  document.getElementById('editAddress').value = student.address || '';
  document.getElementById('editErrorBox').classList.add('hidden');
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

// --- Save Edited Student ---
document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editSaveBtn = document.getElementById('editSaveBtn');
  const editErrorBox = document.getElementById('editErrorBox');
  editErrorBox.classList.add('hidden');
  editSaveBtn.disabled = true;
  editSaveBtn.textContent = 'Saving...';

  const studentId = document.getElementById('editStudentId').value;

  try {
    await db.collection('students').doc(studentId).update({
      name: document.getElementById('editName').value.trim(),
      class: document.getElementById('editClass').value.trim(),
      section: document.getElementById('editSection').value.trim(),
      rollNumber: document.getElementById('editRoll').value.trim(),
      parentName: document.getElementById('editParentName').value.trim(),
      parentPhone: document.getElementById('editParentPhone').value.trim(),
      address: document.getElementById('editAddress').value.trim()
    });

    closeEditModal();
    loadStudentsList();
  } catch (error) {
    console.error(error);
    editErrorBox.textContent = 'Error saving: ' + error.message;
    editErrorBox.classList.remove('hidden');
  }

  editSaveBtn.disabled = false;
  editSaveBtn.textContent = 'Save Changes';
});

// --- Delete Student ---
// Note: Yeh sirf Firestore record delete karta hai. Login account (Firebase Auth)
// alag se delete karna padega Firebase Console > Authentication > Users se,
// kyunki client-side se dusre user ka auth account delete karna security restriction hai.
async function deleteStudent(studentId) {
  const confirmDelete = confirm(`Kya tum sach mein "${studentId}" ko delete karna chahte ho?\n\nNote: Login account abhi bhi Firebase Console se manually delete karna hoga.`);
  if (!confirmDelete) return;

  try {
    await db.collection('students').doc(studentId).delete();
    loadStudentsList();
    loadOverviewStats();
  } catch (error) {
    console.error(error);
    alert('Error deleting: ' + error.message);
  }
}
// Students data cache karte hain taake Edit button mein safely access ho sake
let studentsCache = {};

async function loadStudentsList() {
  try {
    const studentsSnap = await db.collection('students').orderBy('createdAt', 'desc').get();
    const tableBody = document.getElementById('studentsTableBody');
    const noStudents = document.getElementById('noStudents');

    tableBody.innerHTML = '';
    studentsCache = {};

    if (studentsSnap.empty) {
      noStudents.classList.remove('hidden');
      return;
    }
    noStudents.classList.add('hidden');

    studentsSnap.forEach(doc => {
      const s = doc.data();
      studentsCache[s.studentId] = s;

      const row = document.createElement('tr');
      row.className = 'border-t border-gray-100';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-mono text-indigo-600">${s.studentId}</td>
        <td class="px-4 py-3 text-sm">${s.name}</td>
        <td class="px-4 py-3 text-sm">${s.class}${s.section ? '-' + s.section : ''}</td>
        <td class="px-4 py-3 text-sm">${s.parentPhone}</td>
        <td class="px-4 py-3 text-sm space-x-3">
          <button onclick="openEditModal('${s.studentId}')" class="text-indigo-600 hover:underline">Edit</button>
          <button onclick="deleteStudent('${s.studentId}')" class="text-red-600 hover:underline">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading students:', error);
  }
}
