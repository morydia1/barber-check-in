// script.js - customer checkin (with spinner + All Set screen)
const form = document.getElementById('checkinForm');
const statusEl = document.getElementById('formStatus');
const allSetEl = document.getElementById('successMsg');
const newCheckinBtn = document.getElementById('newCheckin');

let selectedAge = null;
let token = null;

// inject small CSS for spinner and all-set if not already present
(function injectStyles() {
  const css = `
  /* spinner & all-set styles injected by script.js */
  .cc-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid rgba(0,0,0,0.12);
    border-top-color: rgba(0,0,0,0.45);
    animation: cc-spin 1s linear infinite;
    display:inline-block;
    vertical-align:middle;
    margin-right:10px;
  }
  @keyframes cc-spin { to { transform: rotate(360deg); } }

  .cc-allset {
    padding: 28px 18px;
    text-align: center;
  }
  .cc-check {
    font-size: 54px;
    line-height:1;
    margin-bottom: 8px;
  }
  .cc-thanks {
    font-size: 18px;
    color: #333;
    margin-bottom: 6px;
    font-weight:700;
  }
  .cc-sub {
    font-size: 14px;
    color: #666;
  }
  .cc-new-btn {
    margin-top:16px;
    display:inline-block;
    padding:10px 14px;
    border-radius:10px;
    background:#ff4d4d;
    color:white;
    font-weight:700;
    border:none;
    cursor:pointer;
  }
  `;
  const s = document.createElement('style');
  s.setAttribute('data-injected-by','script.js');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();

// Age button handling (existing)
document.querySelectorAll('.age-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedAge = btn.dataset.value;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// Fetch a one-time token from Netlify/session -> Apps Script store
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

// helper: disable/enable form inputs and buttons
function setFormEnabled(enabled) {
  const elements = form.querySelectorAll('input, button, select, textarea');
  elements.forEach(el => el.disabled = !enabled);
}

// helper: show spinner + message while pending
function showLoadingMessage(message = 'Processing…') {
  statusEl.style.color = '#333';
  statusEl.innerHTML = `<span class="cc-spinner" aria-hidden="true"></span><span style="vertical-align:middle">${message}</span>`;
}

// helper: render the All Set panel
function showAllSetUI() {
  // hide the form
  form.style.display = 'none';

  // populate success container if available
  if (allSetEl) {
    allSetEl.innerHTML = `
      <div class="cc-allset" role="status" aria-live="polite">
        <div class="cc-check">✅</div>
        <div class="cc-thanks">All set! Thank you for registering.</div>
        <div class="cc-sub">You're on the list — have a great haircut!</div>
        <button id="cc-newcheck-btn" class="cc-new-btn">New check-in</button>
      </div>`;
    allSetEl.style.display = 'block';
    allSetEl.hidden = false;

    // hook new check-in button
    const b = document.getElementById('cc-newcheck-btn');
    if (b) {
      b.addEventListener('click', () => {
        resetForNewCheckin();
      });
    }
  }
}

// helper: reset form and fetch new token
function resetForNewCheckin() {
  // show & reset form
  form.reset();
  form.style.display = '';
  selectedAge = null;
  token = null;
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));

  // hide allSetEl
  if (allSetEl) {
    allSetEl.hidden = true;
    allSetEl.style.display = 'none';
  }

  statusEl.textContent = '';
  // re-enable form
  setFormEnabled(true);
  // fetch a new token
  fetchOneTimeToken();

  // scroll to top for mobile friendliness
  if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'smooth' });
}

// initialize token on page load
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

  // collect & validate
  const name = (document.getElementById('name') || { value: '' }).value.trim();
  const phone = (document.getElementById('phone') || { value: '' }).value.trim();
  const email = (document.getElementById('email') || { value: '' }).value.trim();

  if (!name || !phone || !selectedAge) {
    statusEl.style.color = 'red';
    statusEl.textContent = 'Please fill required fields and select an age group.';
    return;
  }

  // show spinner + disable form while awaiting response
  showLoadingMessage('Saving your check-in…');
  setFormEnabled(false);

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
      // success → show All Set UI and clear token (server already consumed it)
      token = null;
      showAllSetUI();
    } else {
      // failure → re-enable form and show error
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

// Optional external "New Check-in" button (if exists separately)
newCheckinBtn?.addEventListener('click', resetForNewCheckin);
