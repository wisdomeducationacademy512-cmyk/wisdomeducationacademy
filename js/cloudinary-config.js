// ===== CLOUDINARY CONFIGURATION =====
// Photo upload ke liye - free tier, 25GB storage

const CLOUDINARY_CLOUD_NAME = 'di6fstcgu';
const CLOUDINARY_UPLOAD_PRESET = 'iwhnfwxh';

// File select hote hi photo ka preview dikhata hai
function previewStudentPhoto(input, previewElementId) {
  const preview = document.getElementById(previewElementId);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}
async function uploadPhotoToCloudinary(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    throw new Error('Photo upload failed. Check your internet connection.');
  }

  const data = await response.json();
  return data.secure_url; // yeh URL Firestore mein save hoga
}
