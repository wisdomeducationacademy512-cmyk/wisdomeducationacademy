// ===== ADD TEACHER LOGIC =====
// Same approach jo add-student.js mein hai — secondary app se account banate hain
// taake admin apne session se logout na ho

const addTeacherForm = document.getElementById('addTeacherForm');
const successBoxT = document.getElementById('successBoxT');
const errorBoxT = document.getElementById('errorBoxT');
const addTeacherBtn = document.getElementById('addTeacherBtn');

// Unique Teacher ID generate karo: TCH-2025-001 format mein
async function generateTeacherId() {
  const year = new Date().getFullYear();
  const counterRef = db.collection('counters').doc('teachers_' + year);

  const newId = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextNumber = 1;
    if (counterDoc.exists) {
      nextNumber = counterDoc.data().count + 1;
    }
    transaction.set(counterRef, { count: nextNumber });
    return nextNumber;
  });

  const paddedNumber = String(newId).padStart(3, '0');
  return `TCH-${year}-${paddedNumber}`;
}

addTeacherForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  successBoxT.classList.add('hidden');
  errorBoxT.classList.add('hidden');

  const name = document.getElementById('teacherName').value.trim();
  const subject = document.getElementById('teacherSubject').value.trim();
  const phone = document.getElementById('teacherPhone').value.trim();
  const address = document.getElementById('teacherAddress').value.trim();

  if (phone.length < 6) {
    errorBoxT.textContent = 'Please enter a valid phone number (used as login password).';
    errorBoxT.classList.remove('hidden');
    return;
  }

  addTeacherBtn.disabled = true;
  addTeacherBtn.textContent = 'Creating...';

  try {
    const teacherId = await generateTeacherId();
    const loginEmail = teacherId.toLowerCase() + '@school.local';
    const loginPassword = phone;

    // Secondary app use karte hain taake admin logout na ho
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(loginEmail, loginPassword);
    const newUid = userCredential.user.uid;

    await db.collection('users').doc(newUid).set({
      role: 'teacher',
      teacherId: teacherId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('teachers').doc(teacherId).set({
      teacherId: teacherId,
      uid: newUid,
      name: name,
      subject: subject,
      phone: phone,
      address: address,
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await secondaryAuth.signOut();

    successBoxT.innerHTML = `
      <p class="font-bold mb-2">✅ Teacher Added Successfully!</p>
      <p class="text-sm">Give these login details to the teacher:</p>
      <div class="bg-white mt-2 p-3 rounded border border-green-200 font-mono text-sm">
        <p><strong>Teacher ID:</strong> ${teacherId}</p>
        <p><strong>Password:</strong> ${phone}</p>
      </div>
    `;
    successBoxT.classList.remove('hidden');

    addTeacherForm.reset();
    loadTeachersList();
    loadOverviewStats();

  } catch (error) {
    console.error(error);
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      msg = 'This teacher ID already has an account. Please try again.';
    }
    errorBoxT.textContent = 'Error: ' + msg;
    errorBoxT.classList.remove('hidden');
  }

  addTeacherBtn.disabled = false;
  addTeacherBtn.textContent = 'Generate ID & Add Teacher';
});

// ===== TEACHERS LIST =====
let teachersCache = {};

async function loadTeachersList() {
  try {
    const snap = await db.collection('teachers').orderBy('createdAt', 'desc').get();
    const tableBody = document.getElementById('teachersTableBody');
    const noTeachers = document.getElementById('noTeachers');
    const searchInput = document.getElementById('teacherSearchInput');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    tableBody.innerHTML = '';
    teachersCache = {};

    document.getElementById('teachersSectionTotal').textContent = snap.size;

    let visibleCount = 0;

    snap.forEach(doc => {
      const t = doc.data();
      teachersCache[t.teacherId] = t;

      if (searchTerm) {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm) ||
                               t.teacherId.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return;
      }

      visibleCount++;
      const row = document.createElement('tr');
      row.className = 'border-t border-gray-100';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-mono text-indigo-600">${t.teacherId}</td>
        <td class="px-4 py-3 text-sm">${t.name}</td>
        <td class="px-4 py-3 text-sm">${t.subject || '-'}</td>
        <td class="px-4 py-3 text-sm">${t.phone}</td>
        <td class="px-4 py-3 text-sm">
          <button onclick="deleteTeacher('${t.teacherId}')" class="text-red-600 hover:underline">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    noTeachers.classList.toggle('hidden', visibleCount > 0);
  } catch (error) {
    console.error('Error loading teachers:', error);
  }
}

async function deleteTeacher(teacherId) {
  const confirmDelete = confirm(`Teacher "${teacherId}" delete karna hai?\n\nNote: Login account Firebase Console se manually delete karna hoga.`);
  if (!confirmDelete) return;

  try {
    await db.collection('teachers').doc(teacherId).delete();
    loadTeachersList();
    loadOverviewStats();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
