// script.js - customer check-in
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');
const mainContainer = document.getElementById('mainContainer');
const newCheckinBtn = document.getElementById('newCheckin');

let selectedAge = null;
let sessionToken = null;

// ---- Age selection ----
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// ---- Initialize session token ----
async function fetchSessionToken(barber) {
  try {
    const res = await fetch(`/.netlify/functions/session?barber=${encodeURIComponent(barber)}`);
    const json = await res.json();
    if (json && json.success && json.token) {
      sessionToken = json.token;
    } else {
      throw new Error('Failed to get session token');
    }
  } catch (err) {
    console.error(err);
    statusEl.style.color = 'red';
    statusEl.textContent = 'Unable to initialize session. Please try again.';
  }
}

// ---- Form submit ----
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

  // fetch new session token if none
  if (!sessionToken) await fetchSessionToken(barber);

  // collect & validate
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !phone || !selectedAge) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Please fill required fields and select an age group.';
    return;
  }

  const payload = { barber, name, phone, email, ageRange: selectedAge, token: sessionToken };

  try {
    const res = await fetch('/.netlify/functions/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json && json.success) {
      // invalidate token after use
      sessionToken = null;

      // hide form & show All Set message
      form.hidden = true;
      allSetEl.hidden = false;
      allSetEl.style.display = 'block';
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

// ---- Reset for new check-in ----
newCheckinBtn?.addEventListener('click', () => {
  form.reset();
  selectedAge = null;
  sessionToken = null;
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
  form.hidden = false;
  allSetEl.hidden = true;
  allSetEl.style.display = 'none';
  statusEl.textContent = '';
});
