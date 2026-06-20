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
const allSections = ['overview', 'classes', 'students', 'teachers', 'idCards'];
function showSection(sectionName) {
  allSections.forEach(s => {
    document.getElementById(s + '-section').classList.add('hidden');
  });
  document.getElementById(sectionName + '-section').classList.remove('hidden');

  // Section khulte hi relevant data refresh karo
  if (sectionName === 'classes') loadClassesList();
  if (sectionName === 'students') loadStudentsList();
  if (sectionName === 'teachers') loadTeachersList();
  if (sectionName === 'idCards') loadIdCardStudentDropdown();
}

// --- Logout ---
function logout() {
  auth.signOut().then(() => {
    window.location.href = '../index.html';
  });
}

// --- Add Student Modal Open/Close ---
function openAddStudentModal() {
  document.getElementById('successBox').classList.add('hidden');
  document.getElementById('errorBoxAS').classList.add('hidden');
  document.getElementById('addStudentModal').classList.remove('hidden');
}
function closeAddStudentModal() {
  document.getElementById('addStudentModal').classList.add('hidden');
}

// --- Add Teacher Modal Open/Close ---
function openAddTeacherModal() {
  document.getElementById('successBoxT').classList.add('hidden');
  document.getElementById('errorBoxT').classList.add('hidden');
  document.getElementById('addTeacherModal').classList.remove('hidden');
}
function closeAddTeacherModal() {
  document.getElementById('addTeacherModal').classList.add('hidden');
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

// Class filter dropdown ko classes collection se populate karte hain
async function populateClassFilter() {
  try {
    const snap = await db.collection('classes').orderBy('className').get();
    const filterSelect = document.getElementById('classFilter');
    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Classes</option>';
    snap.forEach(doc => {
      const c = doc.data();
      const option = document.createElement('option');
      option.value = c.className;
      option.textContent = 'Class ' + c.className;
      filterSelect.appendChild(option);
    });
    filterSelect.value = currentValue;
    document.getElementById('studentsSectionClasses').textContent = snap.size;
  } catch (error) {
    console.error('Error loading class filter:', error);
  }
}

async function loadStudentsList() {
  try {
    await populateClassFilter();
    const selectedClass = document.getElementById('classFilter').value;
    const searchTerm = (document.getElementById('studentSearchInput').value || '').trim().toLowerCase();

    let query = db.collection('students').orderBy('createdAt', 'desc');
    if (selectedClass) {
      query = db.collection('students').where('class', '==', selectedClass);
    }

    const studentsSnap = await query.get();
    const tableBody = document.getElementById('studentsTableBody');
    const noStudents = document.getElementById('noStudents');

    tableBody.innerHTML = '';
    studentsCache = {};

    let visibleCount = 0;

    studentsSnap.forEach(doc => {
      const s = doc.data();
      studentsCache[s.studentId] = s;

      // Search filter (name ya ID se match karo)
      if (searchTerm) {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm) ||
                               s.studentId.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return;
      }

      visibleCount++;
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

    document.getElementById('studentsSectionTotal').textContent = studentsSnap.size;
    noStudents.classList.toggle('hidden', visibleCount > 0);
  } catch (error) {
    console.error('Error loading students:', error);
  }
}
