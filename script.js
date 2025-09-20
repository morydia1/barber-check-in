// script.js - customer checkin
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('allSet');
const mainContainer = document.getElementById('mainContainer');
const newCheckinBtn = document.getElementById('newCheckin');

let selectedAge = null;

// age selection
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.style.color = '#333';
  statusEl.textContent = 'Processing your check-in…';

  const params = new URLSearchParams(window.location.search);
  const barber = params.get('barber');
  if (!barber) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'This QR code is not configured correctly (no barber).';
    return;
  }

  // collect & validate
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !phone || !selectedAge) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Please fill required fields and select an age group.';
    return;
  }

  const payload = { barber, name, phone, email, ageRange: selectedAge };

  try {
    const res = await fetch('/.netlify/functions/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json && json.success) {
      // show success screen
      form.hidden = true;
      allSetEl.hidden = false;
      statusEl.textContent = '';
    } else {
      statusEl.style.color = 'red';
      statusEl.textContent = (json && json.error) ? `Error: ${json.error}` : 'Unable to save. Try again.';
    }
  } catch (err) {
    console.error(err);
    statusEl.style.color = 'red';
    statusEl.textContent = 'Network error — please try again.';
  }
});

newCheckinBtn?.addEventListener('click', () => {
  // reset
  form.reset();
  selectedAge = null;
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
  form.hidden = false;
  allSetEl.hidden = true;
  statusEl.textContent = '';
});
