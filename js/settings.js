// ===== SETTINGS LOGIC (Admin) =====

async function loadSettingsForm() {
  try {
    const settings = await getAttendanceSettings();
    if (!settings) return;

    document.getElementById('summerStartDate').value = settings.summerStartDate || '';
    document.getElementById('summerEndDate').value = settings.summerEndDate || '';
    document.getElementById('summerStartTime').value = settings.summerStartTime || '';
    document.getElementById('summerEndTime').value = settings.summerEndTime || '';

    document.getElementById('winterStartDate').value = settings.winterStartDate || '';
    document.getElementById('winterEndDate').value = settings.winterEndDate || '';
    document.getElementById('winterStartTime').value = settings.winterStartTime || '';
    document.getElementById('winterEndTime').value = settings.winterEndTime || '';

    document.getElementById('lateGraceMinutes').value = settings.lateGraceMinutes ?? 15;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('saveSettingsBtn');
  const successBox = document.getElementById('settingsSuccessBox');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    await db.collection('settings').doc('attendance').set({
      summerStartDate: document.getElementById('summerStartDate').value,
      summerEndDate: document.getElementById('summerEndDate').value,
      summerStartTime: document.getElementById('summerStartTime').value,
      summerEndTime: document.getElementById('summerEndTime').value,

      winterStartDate: document.getElementById('winterStartDate').value,
      winterEndDate: document.getElementById('winterEndDate').value,
      winterStartTime: document.getElementById('winterStartTime').value,
      winterEndTime: document.getElementById('winterEndTime').value,

      lateGraceMinutes: parseInt(document.getElementById('lateGraceMinutes').value) || 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    successBox.textContent = '✅ Settings saved successfully!';
    successBox.classList.remove('hidden');
    setTimeout(() => successBox.classList.add('hidden'), 3000);
  } catch (error) {
    console.error(error);
    alert('Error saving settings: ' + error.message);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Settings';
});
