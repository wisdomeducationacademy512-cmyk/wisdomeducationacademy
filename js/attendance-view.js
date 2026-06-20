// ===== ATTENDANCE VIEW LOGIC (Admin) =====

let attendanceUnsubscribe = null;

function initAttendanceDateFilter() {
  const dateInput = document.getElementById('attendanceDateFilter');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

async function loadAttendanceList() {
  initAttendanceDateFilter();
  const selectedDate = document.getElementById('attendanceDateFilter').value;

  // Purana real-time listener band karo agar chal raha hai
  if (attendanceUnsubscribe) {
    attendanceUnsubscribe();
  }

  // Real-time listener lagate hain taake Gate scan hote hi yahan turant dikhe
  attendanceUnsubscribe = db.collection('attendance')
    .where('date', '==', selectedDate)
    .onSnapshot(async (snap) => {
      const tableBody = document.getElementById('attendanceTableBody');
      const noAttendance = document.getElementById('noAttendance');
      tableBody.innerHTML = '';

      let presentCount = 0;
      let lateCount = 0;

      const records = [];
      snap.forEach(doc => records.push(doc.data()));
      records.sort((a, b) => (b.scanTimeMs || 0) - (a.scanTimeMs || 0));

      records.forEach(r => {
        if (r.status === 'present') presentCount++;
        if (r.status === 'late') lateCount++;

        const statusColor = r.status === 'present' ? 'text-green-600' : 'text-yellow-600';
        const row = document.createElement('tr');
        row.className = 'border-t border-gray-100';
        row.innerHTML = `
          <td class="px-4 py-3 text-sm font-mono text-indigo-600">${r.personId}</td>
          <td class="px-4 py-3 text-sm">${r.name || '-'}</td>
          <td class="px-4 py-3 text-sm capitalize">${r.type}</td>
          <td class="px-4 py-3 text-sm">${r.timeDisplay || '-'}</td>
          <td class="px-4 py-3 text-sm">${r.gate || '-'}</td>
          <td class="px-4 py-3 text-sm font-semibold ${statusColor} capitalize">${r.status}</td>
        `;
        tableBody.appendChild(row);
      });

      document.getElementById('attPresentCount').textContent = presentCount;
      document.getElementById('attLateCount').textContent = lateCount;
      noAttendance.classList.toggle('hidden', records.length > 0);

      // Absent count: total students minus jo aaj scan ho chuke
      try {
        const studentsSnap = await db.collection('students').get();
        const scannedStudentIds = new Set(
          records.filter(r => r.type === 'student').map(r => r.personId)
        );
        const absentCount = Math.max(studentsSnap.size - scannedStudentIds.size, 0);
        document.getElementById('attAbsentCount').textContent = absentCount;
      } catch (error) {
        console.error('Error calculating absent count:', error);
      }
    });
}
