// ===== NOTICE BOARD LOGIC (Admin) =====

async function populateNoticeClassDropdown() {
  const snap = await db.collection('classes').orderBy('className').get();
  const select = document.getElementById('noticeTargetClass');
  select.innerHTML = '<option value="">All Classes (Everyone)</option>';
  snap.forEach(doc => {
    const c = doc.data();
    const opt = document.createElement('option');
    opt.value = c.className;
    opt.textContent = 'Class ' + c.className + ' only';
    select.appendChild(opt);
  });
}

async function postNotice() {
  const title = document.getElementById('noticeTitle').value.trim();
  const message = document.getElementById('noticeMessage').value.trim();
  const targetClass = document.getElementById('noticeTargetClass').value;

  if (!title || !message) {
    alert('Title aur message dono bharo.');
    return;
  }

  try {
    await db.collection('notices').add({
      title: title,
      message: message,
      targetClass: targetClass,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('noticeTitle').value = '';
    document.getElementById('noticeMessage').value = '';
    document.getElementById('noticeTargetClass').value = '';
    loadNoticesList();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function loadNoticesList() {
  await populateNoticeClassDropdown();

  try {
    const snap = await db.collection('notices').orderBy('createdAt', 'desc').limit(20).get();
    const list = document.getElementById('noticesList');
    list.innerHTML = '';

    if (snap.empty) {
      list.innerHTML = '<p class="text-gray-400 text-center py-6">Abhi koi notice nahi hai.</p>';
      return;
    }

    snap.forEach(doc => {
      const n = doc.data();
      const date = n.createdAt ? n.createdAt.toDate().toLocaleDateString('en-PK') : '';
      const targetLabel = n.targetClass ? `Class ${n.targetClass} only` : 'Everyone';

      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-xl shadow';
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <p class="font-bold text-gray-800">${n.title}</p>
            <p class="text-xs text-gray-400 mt-0.5">${date} • ${targetLabel}</p>
          </div>
          <button onclick="deleteNotice('${doc.id}')" class="text-red-600 hover:underline text-sm">Delete</button>
        </div>
        <p class="text-sm text-gray-600 mt-2">${n.message}</p>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading notices:', error);
  }
}

async function deleteNotice(noticeId) {
  if (!confirm('Yeh notice delete karna hai?')) return;
  try {
    await db.collection('notices').doc(noticeId).delete();
    loadNoticesList();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
