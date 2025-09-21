// script.js - customer checkin (full updated version)
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');
const mainContainer = document.getElementById('mainContainer');
const newCheckinBtn = document.getElementById('newCheckin');

let selectedAge = null;
let sessionToken = null;

// ---- AGE SELECTION ----
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// ---- FETCH SESSION TOKEN ON PAGE LOAD ----
async function fetchSessionToken() {
  const params = new URLSearchParams(window.location.search);
  const barber = params.get('barber');
  if (!barber) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Invalid QR code (no barber).';
    return;
  }

  try {
    const res = await fetch(`/.netlify/functions/session?barber=${encodeURIComponent(barber)}`);
    const json = await res.json();
    if (json && json.success) {
      sessionToken = json.token;
    } else {
      statusEl.style.color = 'red';
      statusEl.textContent = 'Unable to initialize check-in session.';
    }
  } catch (err) {
    console.error(err);
    statusEl.style.color = 'red';
    statusEl.textContent = 'Network error — cannot get session token.';
  }
}
fetchSessionToken();

// ---- FORM SUBMIT ----
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

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !phone || !selectedAge) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Please fill required fields and select an age group.';
    return;
  }

  if (!sessionToken) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Session token missing — refresh page and scan QR code again.';
    return;
  }

  const payload = { barber, name, phone, email, ageRange: selectedAge, sessionToken };

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

// ---- NEW CHECK-IN ----
newCheckinBtn?.addEventListener('click', () => {
  // reset form & age selection
  form.reset();
  selectedAge = null;
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
  form.hidden = false;
  allSetEl.hidden = true;
  statusEl.textContent = '';

  // fetch new session token for next customer
  fetchSessionToken();
});
