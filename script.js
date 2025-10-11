// script.js - customer checkin (one-time session & All Set screen)
// Assumes style.css provides cc-spinner / .cc-allset styles (as in your repo)

const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');
const submitBtn = document.getElementById('submitBtn');

let selectedAge = null;
let sessionToken = null;

// Inject small spinner CSS if not present (safe; won't duplicate)
(function ensureSpinnerStyles(){
  if (document.querySelector('style[data-injected-by="checkin-js"]')) return;
  const css = `
    .cc-spinner { width: 28px; height: 28px; border-radius:50%;
      border:4px solid rgba(0,0,0,0.12); border-top-color: rgba(0,0,0,0.45);
      animation: cc-spin 1s linear infinite; display:inline-block; vertical-align:middle; margin-right:10px; }
    @keyframes cc-spin { to { transform: rotate(360deg); } }
    .cc-allset { padding: 28px 18px; text-align:center; }
    .cc-check { font-size:54px; line-height:1; margin-bottom:8px; }
    .cc-thanks { font-size:18px; color:#333; margin-bottom:6px; font-weight:700 }
    .cc-sub { font-size:14px; color:#666; }
  `;
  const s = document.createElement('style');
  s.setAttribute('data-injected-by','checkin-js');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();

// Age selection handling
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// Utility: disable form controls
function setFormEnabled(enabled) {
  const elements = form.querySelectorAll('input, button, select, textarea');
  elements.forEach(el => el.disabled = !enabled);
  if (enabled) submitBtn.classList.remove('disabled'); else submitBtn.classList.add('disabled');
}

// Show a loading message with spinner
function showLoadingMessage(msg = 'Processing…') {
  statusEl.style.color = '#333';
  statusEl.innerHTML = `<span class="cc-spinner" aria-hidden="true"></span><span style="vertical-align:middle">${msg}</span>`;
}

// Render All Set UI (hides form)
function showAllSet() {
  form.style.display = 'none';
  allSetEl.innerHTML = `
    <div class="cc-allset" role="status" aria-live="polite">
      <div class="cc-check">✅</div>
      <div class="cc-thanks">All set! Thank you for registering.</div>
      <div class="cc-sub">You're on the list — have a great haircut!</div>
    </div>`;
  allSetEl.style.display = 'block';
}

// Read required query params: barber and qr (nonce)
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    barber: params.get('barber') || '',
    qr: params.get('qr') || '' // optional in older flow, but we require for stricter behavior
  };
}

// Fetch one-time session token from Netlify session function
async function fetchSessionToken() {
  const { barber, qr } = getQueryParams();

  if (!barber) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'This QR code is not configured correctly (missing barber).';
    return;
  }

  // we require qr param — this ensures the page was reached via a QR (backend must enforce)
  if (!qr) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Invalid QR (missing qr nonce). Please scan the QR code again.';
    return;
  }

  showLoadingMessage('Initializing…');
  setFormEnabled(false);

  try {
    // call session endpoint with both barber and qr in query string
    const res = await fetch(`/.netlify/functions/session?barber=${encodeURIComponent(barber)}&qr=${encodeURIComponent(qr)}`);
    const json = await res.json();

    if (json && json.success && json.token) {
      sessionToken = json.token;
      statusEl.textContent = ''; // ready
      setFormEnabled(true);
      // Remove query params from URL so reload won't reinitialize this session
      try {
        const newUrl = window.location.origin + window.location.pathname;
        history.replaceState(null, '', newUrl);
      } catch (e) { /* ignore */ }
    } else {
      sessionToken = null;
      setFormEnabled(false);
      statusEl.style.color = 'red';
      statusEl.textContent = (json && json.error) ? `Error: ${json.error}` : 'Unable to initialize session token.';
    }
  } catch (err) {
    console.error(err);
    sessionToken = null;
    setFormEnabled(false);
    statusEl.style.color = 'red';
    statusEl.textContent = 'Network error — cannot get session token.';
  }
}

// Initialize on load
fetchSessionToken();

// Form submit handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { barber } = getQueryParams();
  if (!barber) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Invalid QR (no barber).';
    return;
  }

  if (!sessionToken) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Session token missing — please reload and scan the QR code again.';
    return;
  }

  // collect & validate
  const name = (document.getElementById('name') || { value: '' }).value.trim();
  const phone = (document.getElementById('phone') || { value: '' }).value.trim();
  const email = (document.getElementById('email') || { value: '' }).value.trim();

  if (!name || !phone || !selectedAge) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Please fill required fields and select an age group.';
    return;
  }

  // show spinner and disable to prevent double submit
  showLoadingMessage('Saving your check-in…');
  setFormEnabled(false);

  const payload = {
    barber,
    name,
    phone,
    email,
    ageRange: selectedAge,
    token: sessionToken
  };

  try {
    const res = await fetch('/.netlify/functions/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json && json.success) {
      // success -> show All Set and remove ability to resubmit for this session
      sessionToken = null;
      // clear URL again in case it was preserved and show All Set
      try { history.replaceState(null, '', window.location.origin + window.location.pathname); } catch(e) {}
      showAllSet();
    } else {
      // error returned by server
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
