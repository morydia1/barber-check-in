// script.js - customer checkin (updated)
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');
const mainContainer = document.getElementById('mainContainer');
const newCheckinBtn = document.getElementById('newCheckin');

let selectedAge = null;
let sessionToken = null;

// age selection
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// fetch session token on page load
async function fetchSessionToken() {
  const params = new URLSearchParams(window.location.search);
  const barber = params.get('barber');
  if (!barber) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'This QR code is not configured correctly (no barber).';
    return;
  }

  try {
    const res = await fetch(`/.netlify/functions/session?barber=${encodeURIComponent(barber)}`);
    const json = await res.json();
    if (json && json.success) {
      sessionToken = json.token;
    } else {
      statusEl.style.color = 'red';
      statusEl.textContent = (json && json.error) ? `Error: ${json.error}` : 'Unable to generate session token.';
    }
  } catch (err) {
    console.error(err);
    statusEl.style.color = 'red';
    statusEl.textContent = 'Network error — please try again.';
  }
}

fetchSessionToken();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!sessionToken) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Missing session token. Please reload and scan the QR code again.';
    return;
  }

  statusEl.style.color = '#333';
  statusEl.textContent = 'Processing your check-in…';

  const params = new URLSearchParams(window.location.search);
  const barber = params.get('barber');

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
  sessionToken = null;
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
  form.hidden = false;
  allSetEl.hidden = true;
  statusEl.textContent = '';
  fetchSessionToken(); // get a new token for the next check-in
});
