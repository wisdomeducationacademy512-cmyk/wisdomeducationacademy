// ===== FIREBASE CONFIGURATION =====
// Yeh tumhara Firebase project ka config hai

const firebaseConfig = {
  apiKey: "AIzaSyACqaZ1Y3FXcqqHIpxTHcTFbm8nykNqifY",
  authDomain: "school-management-sys-35139.firebaseapp.com",
  projectId: "school-management-sys-35139",
  storageBucket: "school-management-sys-35139.firebasestorage.app",
  messagingSenderId: "552118762347",
  appId: "1:552118762347:web:2742e30282d3b1b99aea2e"
};

// Firebase initialize karo
firebase.initializeApp(firebaseConfig);

// Auth aur Firestore ko globally available banao
const auth = firebase.auth();
const db = firebase.firestore();
