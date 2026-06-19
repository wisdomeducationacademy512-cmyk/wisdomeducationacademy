// ===== CLASSES & SECTIONS LOGIC =====

const addClassForm = document.getElementById('addClassForm');
const classErrorBox = document.getElementById('classErrorBox');
let classesCache = {};

addClassForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  classErrorBox.classList.add('hidden');

  const className = document.getElementById('className').value.trim();
  const sectionsRaw = document.getElementById('classSections').value.trim();
  const sections = sectionsRaw
    ? sectionsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  const addClassBtn = document.getElementById('addClassBtn');
  addClassBtn.disabled = true;
  addClassBtn.textContent = 'Adding...';

  try {
    await db.collection('classes').doc(className).set({
      className: className,
      sections: sections,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    addClassForm.reset();
    loadClassesList();
  } catch (error) {
    console.error(error);
    classErrorBox.textContent = 'Error: ' + error.message;
    classErrorBox.classList.remove('hidden');
  }

  addClassBtn.disabled = false;
  addClassBtn.textContent = 'Add Class';
});

async function loadClassesList() {
  try {
    const snap = await db.collection('classes').orderBy('className').get();
    const tableBody = document.getElementById('classesTableBody');
    const noClasses = document.getElementById('noClasses');

    tableBody.innerHTML = '';
    classesCache = {};

    if (snap.empty) {
      noClasses.classList.remove('hidden');
      return;
    }
    noClasses.classList.add('hidden');

    snap.forEach(doc => {
      const c = doc.data();
      classesCache[c.className] = c;

      const row = document.createElement('tr');
      row.className = 'border-t border-gray-100';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-semibold">${c.className}</td>
        <td class="px-4 py-3 text-sm">${(c.sections || []).join(', ') || '-'}</td>
        <td class="px-4 py-3 text-sm">
          <button onclick="deleteClass('${c.className}')" class="text-red-600 hover:underline">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading classes:', error);
  }
}

async function deleteClass(className) {
  const confirmDelete = confirm(`Class "${className}" delete karna hai?`);
  if (!confirmDelete) return;

  try {
    await db.collection('classes').doc(className).delete();
    loadClassesList();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
