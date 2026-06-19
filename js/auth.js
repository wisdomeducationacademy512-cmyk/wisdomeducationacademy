// ===== LOGIN LOGIC =====

const loginForm = document.getElementById('loginForm');
const errorBox = document.getElementById('errorBox');
const loginBtn = document.getElementById('loginBtn');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}

// Agar user ID likhe (jaise STU-2025-001) toh use internal email format mein convert karo
// Agar already email hai (admin/teacher ke liye) toh waisa hi rehne do
function convertToEmail(input) {
  if (input.includes('@')) {
    return input.trim().toLowerCase();
  }
  return input.trim().toLowerCase() + '@school.local';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const rawId = document.getElementById('loginId').value;
  const password = document.getElementById('loginPassword').value;
  const email = convertToEmail(rawId);

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    // Firebase Auth se login karo
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Firestore se user ka role check karo
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      showError('User record not found. Contact admin.');
      await auth.signOut();
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
      return;
    }

    const userData = userDoc.data();
    const role = userData.role;

    // Role ke hisaab se sahi dashboard pe bhejo
    if (role === 'admin') {
      window.location.href = 'pages/admin-dashboard.html';
    } else if (role === 'teacher') {
      window.location.href = 'pages/teacher-dashboard.html';
    } else if (role === 'parent') {
      window.location.href = 'pages/parent-dashboard.html';
    } else if (role === 'gate') {
      window.location.href = 'pages/gate-scanner.html';
    } else {
      showError('Unknown role. Contact admin.');
      await auth.signOut();
    }

  } catch (error) {
    console.error(error);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      showError('Invalid ID or password. Please check and try again.');
    } else {
      showError('Login failed: ' + error.message);
    }
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Login';
});
