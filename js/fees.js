// ===== FEE MANAGEMENT LOGIC =====

function getCurrentMonthValue() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function initFeeMonthFilter() {
  const monthInput = document.getElementById('feeMonthFilter');
  if (!monthInput.value) monthInput.value = getCurrentMonthValue();
}

// --- Fee Structure (per class monthly amount) ---
async function populateFeeStructureClassDropdown() {
  const snap = await db.collection('classes').orderBy('className').get();
  const select = document.getElementById('feeStructureClass');
  const filterSelect = document.getElementById('feeClassFilter');
  select.innerHTML = '<option value="">-- Select Class --</option>';
  const currentFilterValue = filterSelect.value;
  filterSelect.innerHTML = '<option value="">All Classes</option>';

  snap.forEach(doc => {
    const c = doc.data();
    const opt1 = document.createElement('option');
    opt1.value = c.className;
    opt1.textContent = 'Class ' + c.className;
    select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = c.className;
    opt2.textContent = 'Class ' + c.className;
    filterSelect.appendChild(opt2);
  });
  filterSelect.value = currentFilterValue;
}

async function loadFeeStructureList() {
  const snap = await db.collection('feeStructure').get();
  const list = document.getElementById('feeStructureList');
  list.innerHTML = '';
  if (snap.empty) {
    list.innerHTML = '<p class="text-gray-400">Abhi koi fee structure set nahi hui.</p>';
    return;
  }
  const items = [];
  snap.forEach(doc => items.push(doc.data()));
  items.sort((a, b) => a.className.localeCompare(b.className));
  items.forEach(f => {
    const p = document.createElement('p');
    p.textContent = `Class ${f.className}: Rs. ${f.monthlyAmount}`;
    list.appendChild(p);
  });
}

async function saveFeeStructure() {
  const className = document.getElementById('feeStructureClass').value;
  const amount = parseFloat(document.getElementById('feeStructureAmount').value);

  if (!className || !amount) {
    alert('Class aur amount dono select/enter karo.');
    return;
  }

  try {
    await db.collection('feeStructure').doc(className).set({
      className: className,
      monthlyAmount: amount
    });
    document.getElementById('feeStructureAmount').value = '';
    loadFeeStructureList();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// --- Fees List for Selected Month ---
let feesListCache = {};

async function loadFeesList() {
  await populateFeeStructureClassDropdown();
  await loadFeeStructureList();
  initFeeMonthFilter();

  const month = document.getElementById('feeMonthFilter').value;
  const selectedClass = document.getElementById('feeClassFilter').value;

  try {
    // Sab students lao (class filter ke saath agar select kiya hai)
    let studentsQuery = db.collection('students');
    if (selectedClass) studentsQuery = studentsQuery.where('class', '==', selectedClass);
    const studentsSnap = await studentsQuery.get();

    // Is mahine ke saare fee records lao
    const feesSnap = await db.collection('fees').where('month', '==', month).get();
    const feeRecords = {};
    feesSnap.forEach(doc => { feeRecords[doc.data().studentId] = doc.data(); });

    // Fee structure (class-wise amount) lao
    const structureSnap = await db.collection('feeStructure').get();
    const structure = {};
    structureSnap.forEach(doc => { structure[doc.id] = doc.data().monthlyAmount; });

    const tableBody = document.getElementById('feesTableBody');
    const noFees = document.getElementById('noFees');
    tableBody.innerHTML = '';
    feesListCache = {};

    let collected = 0, pending = 0, paidCount = 0;

    const students = [];
    studentsSnap.forEach(doc => students.push(doc.data()));
    students.sort((a, b) => a.name.localeCompare(b.name));

    students.forEach(s => {
      const record = feeRecords[s.studentId];
      const defaultAmount = structure[s.class] || 0;
      const amount = record ? record.amount : defaultAmount;
      const status = record ? record.status : 'unpaid';

      feesListCache[s.studentId] = { student: s, amount, status, record };

      if (status === 'paid') {
        collected += amount;
        paidCount++;
      } else {
        pending += amount;
      }

      const row = document.createElement('tr');
      row.className = 'border-t border-gray-100';
      const statusBadge = status === 'paid'
        ? '<span class="text-green-600 font-semibold">Paid</span>'
        : '<span class="text-red-600 font-semibold">Unpaid</span>';
      const actionBtn = status === 'paid'
        ? `<button onclick="printReceipt('${s.studentId}')" class="text-indigo-600 hover:underline">Receipt</button>`
        : `<button onclick="openMarkPaidModal('${s.studentId}')" class="text-green-600 hover:underline">Mark Paid</button>`;

      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-mono text-indigo-600">${s.studentId}</td>
        <td class="px-4 py-3 text-sm">${s.name}</td>
        <td class="px-4 py-3 text-sm">${s.class}${s.section ? '-' + s.section : ''}</td>
        <td class="px-4 py-3 text-sm">Rs. ${amount}</td>
        <td class="px-4 py-3 text-sm">${statusBadge}</td>
        <td class="px-4 py-3 text-sm">${actionBtn}</td>
      `;
      tableBody.appendChild(row);
    });

    document.getElementById('feeCollectedTotal').textContent = 'Rs. ' + collected;
    document.getElementById('feePendingTotal').textContent = 'Rs. ' + pending;
    document.getElementById('feePaidCount').textContent = paidCount;
    noFees.classList.toggle('hidden', students.length > 0);

  } catch (error) {
    console.error('Error loading fees:', error);
  }
}

// --- Mark Paid Modal ---
function openMarkPaidModal(studentId) {
  const data = feesListCache[studentId];
  document.getElementById('payStudentId').value = studentId;
  document.getElementById('payMonth').value = document.getElementById('feeMonthFilter').value;
  document.getElementById('payAmount').value = data ? data.amount : '';
  document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('markPaidModal').classList.remove('hidden');
}

function closeMarkPaidModal() {
  document.getElementById('markPaidModal').classList.add('hidden');
}

async function confirmFeePaid() {
  const studentId = document.getElementById('payStudentId').value;
  const month = document.getElementById('payMonth').value;
  const amount = parseFloat(document.getElementById('payAmount').value);
  const paidDate = document.getElementById('payDate').value;

  if (!amount || !paidDate) {
    alert('Amount aur date dono bharo.');
    return;
  }

  const data = feesListCache[studentId];
  const docId = `${studentId}_${month}`;

  try {
    await db.collection('fees').doc(docId).set({
      studentId: studentId,
      name: data.student.name,
      class: data.student.class,
      month: month,
      amount: amount,
      status: 'paid',
      paidDate: paidDate,
      receiptNo: docId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeMarkPaidModal();
    loadFeesList();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// --- Print Receipt ---
async function printReceipt(studentId) {
  const month = document.getElementById('feeMonthFilter').value;
  const docId = `${studentId}_${month}`;
  const doc = await db.collection('fees').doc(docId).get();
  if (!doc.exists) {
    alert('Receipt not found.');
    return;
  }
  const r = doc.data();

  const printWindow = window.open('', '_blank', 'width=400,height=500');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fee Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        .receipt { border: 2px solid #312e81; border-radius: 10px; padding: 20px; width: 300px; }
        h2 { text-align: center; color: #312e81; margin: 0 0 14px 0; }
        p { margin: 6px 0; font-size: 14px; color: #374151; }
        .label { color: #6b7280; }
        .total { border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px; font-size: 16px; font-weight: bold; }
      </style>
    </head>
    <body onload="window.print(); window.onafterprint = function(){ window.close(); }">
      <div class="receipt">
        <h2>🏫 Fee Receipt</h2>
        <p><span class="label">Receipt No:</span> ${r.receiptNo}</p>
        <p><span class="label">Student:</span> ${r.name} (${r.studentId})</p>
        <p><span class="label">Class:</span> ${r.class}</p>
        <p><span class="label">Month:</span> ${r.month}</p>
        <p><span class="label">Paid Date:</span> ${r.paidDate}</p>
        <p class="total">Amount Paid: Rs. ${r.amount}</p>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
