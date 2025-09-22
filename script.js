// script.js - customer checkin
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');

let selectedAge = null;
let token = null;

// Age button handling
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// Fetch a one-time token
async function fetchOneTimeToken() {
  statusEl.style.color = '#333';
  statusEl.innerHTML = 'Initializing…';

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

// helper: disable/enable form inputs
function setFormEnabled(enabled) {
  const elements = form.querySelectorAll('input, button, select, textarea');
  elements.forEach(el => el.disabled = !enabled);
}

// helper: show spinner while pending
function showLoadingMessage(message = 'Processing…') {
  statusEl.style.color = '#333';
  statusEl.innerHTML = `<span class="cc-spinner" aria-hidden="true"></span><span style="vertical-align:middle">${message}</span>`;
}

// helper: render the All Set panel
function showAllSetUI() {
  form.style.display = 'none'; // hide form

  if (allSetEl) {
    allSetEl.innerHTML = `
      <div class="cc-allset" role="status" aria-live="polite">
        <div class="cc-check">✅</div>
        <div class="cc-thanks">All set! Thank you for registering.</div>
        <div class="cc-sub">You're on the list — have a great haircut!</div>
      </div>`;
    allSetEl.style.display = 'block';
    allSetEl.hidden = false;
  }
}

// initialize token
fetchOneTimeToken();

// Form submit handler
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

  const name = (document.getElementById('name') || { value: '' }).value.trim();
  const phone = (document.getElementById('phone') || { value: '' }).value.trim();
  const email = (document.getElementById('email') || { value: '' }).value.trim();

  if (!name || !phone || !selectedAge) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Please fill required fields and select an age group.';
    return;
  }

  showLoadingMessage('Saving your check-in…');
  setFormEnabled(false);

  const payload = { barber, name, phone, email, ageRange: selectedAge, token };

  try {
    const res = await fetch('/.netlify/functions/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json && json.success) {
      token = null; // server consumed it
      showAllSetUI();
    } else {
      setFormEnabled(true);
      statusEl.style.color = 'red';
      statusEl.textContent = (json && json.error) ? `Error: ${json.error}` : 'Unable to save. Try again.';
    }
  } catch (err) {
    console.error(err);
    setFormEnabled(true);
    statusEl.style.color = 'red';
    statusEl.textContent = 'Network error — please try again.';
  }
});
