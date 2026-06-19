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

// --- Load Students List Table ---
async function loadStudentsList() {
  try {
    const studentsSnap = await db.collection('students').orderBy('createdAt', 'desc').get();
    const tableBody = document.getElementById('studentsTableBody');
    const noStudents = document.getElementById('noStudents');

    tableBody.innerHTML = '';

    if (studentsSnap.empty) {
      noStudents.classList.remove('hidden');
      return;
    }
    noStudents.classList.add('hidden');

    studentsSnap.forEach(doc => {
      const s = doc.data();
      const row = document.createElement('tr');
      row.className = 'border-t border-gray-100';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-mono text-indigo-600">${s.studentId}</td>
        <td class="px-4 py-3 text-sm">${s.name}</td>
        <td class="px-4 py-3 text-sm">${s.class}${s.section ? '-' + s.section : ''}</td>
        <td class="px-4 py-3 text-sm">${s.parentPhone}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading students:', error);
  }
}
