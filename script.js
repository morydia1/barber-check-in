// script.js - customer checkin (final)
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');
const newCheckinBtn = document.getElementById('newCheckin');

let selectedAge = null;
let token = null;

// Age selection
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// Fetch a one-time token (called on load and when user requests a new check-in)
async function fetchOneTimeToken() {
  statusEl.style.color = '#333';
  statusEl.textContent = 'Initializing…';

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
    if (json && json.success && json.token) {
      token = json.token;
      statusEl.textContent = ''; // ready
    } else {
      token = null;
      statusEl.style.color = 'red';
      statusEl.textContent = (json && json.error) ? `Error: ${json.error}` : 'Unable to initialize session token.';
    }
  } catch (err) {
    console.error(err);
    token = null;
    statusEl.style.color = 'red';
    statusEl.textContent = 'Network error — cannot get session token.';
  }
}

// initialize token on page load
fetchOneTimeToken();

// Submit handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const params = new URLSearchParams(window.location.search);
  const barber = params.get('barber');
  if (!barber) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Invalid QR (no barber).';
    return;
  }

  if (!token) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Session token missing — please reload and scan the QR again.';
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

  statusEl.style.color = '#333';
  statusEl.textContent = 'Processing your check-in…';

  const payload = {
    barber,
    name,
    phone,
    email,
    ageRange: selectedAge,
    token
  };

  try {
    const res = await fetch('/.netlify/functions/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json && json.success) {
      // Hide form, show all set message
      form.hidden = true;
      if (allSetEl) {
        allSetEl.hidden = false;
        allSetEl.style.display = 'block';
      }
      statusEl.textContent = '';
      // token is already consumed on the server (proxy called checktoken), so clear it client-side
      token = null;
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

// New checkin button - resets form and fetches fresh token
newCheckinBtn?.addEventListener('click', () => {
  form.reset();
  selectedAge = null;
  token = null;
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
  form.hidden = false;
  if (allSetEl) { allSetEl.hidden = true; allSetEl.style.display = 'none'; }
  statusEl.textContent = '';
  // fetch new token for next customer
  fetchOneTimeToken();
});
