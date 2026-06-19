// ===== ADD STUDENT LOGIC =====
// Important: Naya user account banane ke liye humein ek "secondary" Firebase app
// instance use karna padta hai, warna admin khud ba khud logout ho jata hai
// (Firebase ka default behavior hai jab createUserWithEmailAndPassword call hoti hai)

const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = secondaryApp.auth();

const addStudentForm = document.getElementById('addStudentForm');
const successBox = document.getElementById('successBox');
const errorBoxAS = document.getElementById('errorBoxAS');
const addStudentBtn = document.getElementById('addStudentBtn');

// Unique Student ID generate karo: STU-2025-001 format mein
async function generateStudentId() {
  const year = new Date().getFullYear();
  const counterRef = db.collection('counters').doc('students_' + year);

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
  return `STU-${year}-${paddedNumber}`;
}

addStudentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  successBox.classList.add('hidden');
  errorBoxAS.classList.add('hidden');

  const name = document.getElementById('studentName').value.trim();
  const studentClass = document.getElementById('studentClass').value.trim();
  const section = document.getElementById('studentSection').value.trim();
  const rollNumber = document.getElementById('rollNumber').value.trim();
  const parentName = document.getElementById('parentName').value.trim();
  const parentPhone = document.getElementById('parentPhone').value.trim();
  const address = document.getElementById('studentAddress').value.trim();

  if (parentPhone.length < 6) {
    errorBoxAS.textContent = 'Please enter a valid parent phone number (used as login password).';
    errorBoxAS.classList.remove('hidden');
    return;
  }

  addStudentBtn.disabled = true;
  addStudentBtn.textContent = 'Creating...';

  try {
    // Step 1: Unique Student ID generate karo
    const studentId = await generateStudentId();

    // Step 2: Login email banao (internal use - parent isay nahi dekhega)
    const loginEmail = studentId.toLowerCase() + '@school.local';
    const loginPassword = parentPhone;

    // Step 3: Secondary app se account banao (admin logout nahi hoga)
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(loginEmail, loginPassword);
    const newUid = userCredential.user.uid;

    // Step 4: Firestore mein user role save karo
    await db.collection('users').doc(newUid).set({
      role: 'parent',
      studentId: studentId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Step 5: Student ka poora record save karo
    await db.collection('students').doc(studentId).set({
      studentId: studentId,
      uid: newUid,
      name: name,
      class: studentClass,
      section: section,
      rollNumber: rollNumber,
      parentName: parentName,
      parentPhone: parentPhone,
      address: address,
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Step 6: Secondary app se sign out karo (cleanup)
    await secondaryAuth.signOut();

    // Step 7: Success message dikhao - yeh credentials print/save karne hain
    successBox.innerHTML = `
      <p class="font-bold mb-2">✅ Student Added Successfully!</p>
      <p class="text-sm">Give these login details to the parent:</p>
      <div class="bg-white mt-2 p-3 rounded border border-green-200 font-mono text-sm">
        <p><strong>Student ID:</strong> ${studentId}</p>
        <p><strong>Password:</strong> ${parentPhone}</p>
      </div>
    `;
    successBox.classList.remove('hidden');

    addStudentForm.reset();
    loadStudentsList();
    loadOverviewStats();

  } catch (error) {
    console.error(error);
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      msg = 'This student ID already has an account. Please try again.';
    }
    errorBoxAS.textContent = 'Error: ' + msg;
    errorBoxAS.classList.remove('hidden');
  }

  addStudentBtn.disabled = false;
  addStudentBtn.textContent = 'Generate ID & Add Student';
});
