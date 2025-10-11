// admin.js (ready-to-paste) - menu + spinner + disable-protection
document.addEventListener('DOMContentLoaded', () => {
  // ---- DOM elements ----
  const loginModal = document.getElementById('loginModal');
  const loginBtn = document.getElementById('loginBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginTokenInput = document.getElementById('loginToken');
  const loginStatus = document.getElementById('loginStatus');

  const qrApp = document.getElementById('qrApp');

  const menuGenerate = document.getElementById('menuGenerate');
  const menuMy = document.getElementById('menuMy');
  const menuAdd = document.getElementById('menuAdd');

  const adminView = document.getElementById('adminView');
  const barberView = document.getElementById('barberView');
  const newBarberView = document.getElementById('newBarberView');

  const adminStatus = document.getElementById('adminStatus');
  const barberStatus = document.getElementById('barberStatus');
  const newBarberStatus = document.getElementById('newBarberStatus');
  const qrContainer = document.getElementById('qr-container');

  const barberEmailInput = document.getElementById('barberEmail');
  const barberHeading = document.getElementById('barberHeading');
  const adminLogoInput = document.getElementById('adminLogo');
  const barberLogoInput = document.getElementById('barberLogo');
  const generateAdminBtn = document.getElementById('generateAdminQR');
  const regenAdminBtn = document.getElementById('regenAdminQR');
  const generateBarberBtn = document.getElementById('generateBarberQR');
  const regenBarberBtn = document.getElementById('regenBarberQR');

  const newBarberDisplayNameInput = document.getElementById('newBarberDisplayName');
  const newBarberPseudoInput = document.getElementById('newBarberPseudo');
  const newBarberEmailInput = document.getElementById('newBarberEmail');
  const createNewBarberBtn = document.getElementById('createNewBarber');

  let currentRole = null;
  let currentEmail = null;
  let currentPseudonym = null;
  let currentLoginSecret = null; // admin token or barber token

  // ---------- UI: menu switch ----------
  function setActiveMenu(button) {
  [menuGenerate, menuMy, menuAdd].forEach(b => b.classList.remove('active'));
  if (button) button.classList.add('active');

  // show/hide sections by role
  if (currentRole === 'admin') {
    adminView.style.display = (button === menuGenerate) ? 'block' : 'none';
    newBarberView.style.display = (button === menuAdd) ? 'block' : 'none';
    barberView.style.display = 'none';  // never show barber QR section for admin
  } else if (currentRole === 'barber') {
    barberView.style.display = (button === menuMy) ? 'block' : 'none';
    adminView.style.display = 'none';
    newBarberView.style.display = 'none';
  }

  qrContainer.innerHTML = ''; // clear previous QR
}


  menuGenerate.addEventListener('click', () => setActiveMenu(menuGenerate));
  menuMy.addEventListener('click', () => setActiveMenu(menuMy));
  menuAdd.addEventListener('click', () => setActiveMenu(menuAdd));

  // ---------- Helpers to disable/enable buttons to avoid double clicks ----------
  function disableButton(btn, disabled = true, textWhile = null) {
    if (!btn) return;
    btn.dataset._origText = btn.dataset._origText || btn.textContent;
    btn.disabled = disabled;
    if (disabled && textWhile) {
      btn.textContent = textWhile;
      // add spinner small
      btn.insertAdjacentHTML('beforeend', ' <span class="cc-spinner" style="width:16px;height:16px;border-width:3px;"></span>');
    } else if (!disabled) {
      // restore original text and remove injected spinner
      btn.textContent = btn.dataset._origText || btn.textContent;
    }
  }

  function setSectionStatus(el, message, color = '#333') {
    if (!el) return;
    el.style.color = color;
    el.textContent = message;
  }

  // ---------- Login ----------
  loginBtn.addEventListener('click', async () => {
    setSectionStatus(loginStatus, 'Verifying…', '#333');
    loginBtn.disabled = true;
    const email = (loginEmail.value || '').trim().toLowerCase();
  const token = (loginTokenInput.value || '').trim();

    if (!email) {
      setSectionStatus(loginStatus, 'Please enter your email.', 'red');
      loginBtn.disabled = false;
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });
      const payload = await res.json();
      if (!res.ok) {
        setSectionStatus(loginStatus, payload.error || 'Unauthorized', 'red');
        loginBtn.disabled = false;
        return;
      }

  currentRole = payload.role;
  currentEmail = email;
  currentPseudonym = payload.pseudonym || null;
  // For admin, this is the admin token; for barber, this will be the barber phone (we use phone as auth)
  currentLoginSecret = token;

      loginModal.style.display = 'none';
      qrApp.style.display = 'block';

      // choose default panel by role
      if (currentRole === 'admin') {
        setActiveMenu(menuGenerate);      // show "Generate QR"
        menuAdd.style.display = 'inline-flex';  // show "Add Barber"
        menuMy.style.display = 'none';    // hide "My QR" menu
      } else if (currentRole === 'barber') {
        setActiveMenu(menuMy);            // show "My QR"
        menuAdd.style.display = 'none';   // hide admin add barber
        menuGenerate.style.display = 'none'; // hide admin generate for other barbers

        // Immediately fetch barber info (to get current nonce) and display the current QR in My QR
        try {
          const info = await lookupBarberByEmail(currentEmail);
          if (info && info.pseudonym) {
            currentPseudonym = info.pseudonym;
            // prefer info.qrNonce or info.nonce or info.value
            const nonce = info.qrNonce || info.nonce || info.value || null;
            await generateQRForPseudo(currentPseudonym, barberLogoInput.files[0]||null, nonce);
            setSectionStatus(barberStatus, 'Displayed your current QR below.', '#333');
          } else {
            setSectionStatus(barberStatus, 'No barber record found for your email.', 'red');
          }
        } catch (err) {
          console.error('Error fetching barber info:', err);
          setSectionStatus(barberStatus, 'Failed to load your QR.', 'red');
        }
      }

      setSectionStatus(loginStatus, '', '#333');
      loginBtn.disabled = false;
    } catch (err) {
      console.error(err);
      setSectionStatus(loginStatus, 'Network error — try again', 'red');
      loginBtn.disabled = false;
    }
  });

  // ---------- small lookup helper ----------
  async function lookupBarberByEmail(email) {
    const res = await fetch('/.netlify/functions/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  }

  // ---------- regen call ----------
  async function callRegen(pseudonym, authEmail, authToken) {
    const res = await fetch('/.netlify/functions/regenQr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudonym, authEmail, authToken })
    });
    if (!res.ok) {
      const txt = await res.text();
      try { return { success: false, error: JSON.parse(txt).error || txt }; } catch { return { success: false, error: txt }; }
    }
    const json = await res.json();
    // normalize response: support { value, nonce, token }
    json.token = json.token || json.value || json.nonce || null;
    return json;
  }

  // ---------- Generate & Rotate (Admin) ----------
  generateAdminBtn?.addEventListener('click', async () => {
    setSectionStatus(adminStatus, 'Looking up barber…', '#333');
    qrContainer.innerHTML = '';

    const barberEmail = (barberEmailInput.value || '').trim().toLowerCase();
    const logoFile = adminLogoInput.files[0] || null;
    if (!barberEmail) {
      setSectionStatus(adminStatus, 'Enter a barber email.', 'red');
      return;
    }

    // prevent duplicates
    disableButton(generateAdminBtn, true, 'Generating…');

    try {
      const info = await lookupBarberByEmail(barberEmail);
      if (!info || !info.pseudonym) {
        setSectionStatus(adminStatus, (info && info.error) ? info.error : 'Barber not found in registry.', 'red');
        return;
      }
      const pseudo = info.pseudonym;

      // must be admin to rotate other barbers
      if (!currentEmail || !currentLoginSecret || currentRole !== 'admin') {
        setSectionStatus(adminStatus, 'You must be signed in as ADMIN to rotate/generate for other barbers.', 'red');
        return;
      }

      setSectionStatus(adminStatus, 'Rotating nonce and generating QR…', '#333');
      const regenRes = await callRegen(pseudo, currentEmail, currentLoginSecret);
      if (!regenRes || !regenRes.success) {
        setSectionStatus(adminStatus, regenRes.error || 'Failed to rotate QR.', 'red');
        return;
      }

      await generateQRForPseudo(pseudo, logoFile, regenRes.token);
      setSectionStatus(adminStatus, 'QR ready — save or download below.', 'green');
    } catch (err) {
      console.error(err);
      setSectionStatus(adminStatus, 'Network error during lookup.', 'red');
    } finally {
      disableButton(generateAdminBtn, false);
    }
  });

  // ---------- Rotate only (admin) ----------
  regenAdminBtn?.addEventListener('click', async () => {
    setSectionStatus(adminStatus, 'Rotating QR…', '#333');
    qrContainer.innerHTML = '';

    const barberEmail = (barberEmailInput.value || '').trim().toLowerCase();
    if (!barberEmail) {
      setSectionStatus(adminStatus, 'Enter a barber email to rotate.', 'red');
      return;
    }

    disableButton(regenAdminBtn, true, 'Rotating…');

    try {
      const info = await lookupBarberByEmail(barberEmail);
      if (!info || !info.pseudonym) {
        setSectionStatus(adminStatus, (info && info.error) ? info.error : 'Barber not found.', 'red');
        return;
      }
      if (!currentEmail || !currentLoginSecret || currentRole !== 'admin') {
        setSectionStatus(adminStatus, 'You must be signed in as ADMIN to rotate QR for other barbers.', 'red');
        return;
      }
      const regenRes = await callRegen(info.pseudonym, currentEmail, currentLoginSecret);
      if (!regenRes || !regenRes.success) {
        setSectionStatus(adminStatus, regenRes.error || 'Failed to rotate QR.', 'red');
        return;
      }
      await generateQRForPseudo(info.pseudonym, adminLogoInput.files[0]||null, regenRes.token);
      setSectionStatus(adminStatus, 'QR rotated & ready.', 'green');
    } catch (err) {
      console.error(err);
      setSectionStatus(adminStatus, 'Network error during rotate.', 'red');
    } finally {
      disableButton(regenAdminBtn, false);
    }
  });

  // ---------- Barber: generate or rotate self ----------
  generateBarberBtn?.addEventListener('click', async () => {
    setSectionStatus(barberStatus, 'Generating your QR…', '#333');
    qrContainer.innerHTML = '';

    if (!currentPseudonym) {
      setSectionStatus(barberStatus, 'Your account is missing a pseudonym.', 'red');
      return;
    }

    disableButton(generateBarberBtn, true, 'Generating…');

    try {
      // If barber signed in with their token, offer secure rotate — otherwise generate without nonce (legacy)
      if (!currentLoginSecret || currentRole !== 'barber') {
        // generate without nonce (legacy behavior)
        await generateQRForPseudo(currentPseudonym, barberLogoInput.files[0]||null, null);
        setSectionStatus(barberStatus, 'QR ready (no nonce) — consider rotating for security.', 'green');
      } else {
        const regenRes = await callRegen(currentPseudonym, currentEmail, currentLoginSecret);
        if (!regenRes || !regenRes.success) {
          setSectionStatus(barberStatus, regenRes.error || 'Failed to rotate your QR.', 'red');
        } else {
          await generateQRForPseudo(currentPseudonym, barberLogoInput.files[0]||null, regenRes.token);
          setSectionStatus(barberStatus, 'Your QR rotated & ready.', 'green');
        }
      }
    } catch (err) {
      console.error(err);
      setSectionStatus(barberStatus, 'Error generating QR.', 'red');
    } finally {
      disableButton(generateBarberBtn, false);
    }
  });

  regenBarberBtn?.addEventListener('click', async () => {
    setSectionStatus(barberStatus, 'Rotating your QR…', '#333');
    qrContainer.innerHTML = '';

    if (!currentPseudonym || currentRole !== 'barber' || !currentLoginSecret) {
      setSectionStatus(barberStatus, 'You must be signed in as barber (with your token) to rotate your QR.', 'red');
      return;
    }

    disableButton(regenBarberBtn, true, 'Rotating…');

    try {
      const regenRes = await callRegen(currentPseudonym, currentEmail, currentLoginSecret);
      if (!regenRes || !regenRes.success) {
        setSectionStatus(barberStatus, regenRes.error || 'Failed to rotate QR.', 'red');
        return;
      }
      await generateQRForPseudo(currentPseudonym, barberLogoInput.files[0]||null, regenRes.token);
      setSectionStatus(barberStatus, 'Your QR rotated & ready.', 'green');
    } catch (err) {
      console.error(err);
      setSectionStatus(barberStatus, 'Network error during rotate.', 'red');
    } finally {
      disableButton(regenBarberBtn, false);
    }
  });

  // ---------- Create new barber ----------
  createNewBarberBtn?.addEventListener('click', async () => {
    setSectionStatus(newBarberStatus, 'Creating barber…', '#333');

    const displayName = newBarberDisplayNameInput.value.trim();
    const pseudonym = newBarberPseudoInput.value.trim();
    const email = newBarberEmailInput.value.trim().toLowerCase();
    const phone = (document.getElementById('newBarberPhone') || { value: '' }).value.trim();
    if (!displayName || !pseudonym || !email || !phone) {
      setSectionStatus(newBarberStatus, 'All fields are required.', 'red');
      return;
    }

    disableButton(createNewBarberBtn, true, 'Creating…');

    try {
      const res = await fetch('/.netlify/functions/addBarber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, pseudonym, email, phone })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSectionStatus(newBarberStatus, data.error || 'Failed to create barber.', 'red');
        return;
      }
      setSectionStatus(newBarberStatus, 'Barber created!', 'green');
  newBarberStatus.innerHTML = `Barber created! Sheet: <a href="${data.sheetUrl}" target="_blank">${data.sheetUrl}</a><br>Phone: ${phone}`;
      // Prefer App Script's returned value/nonce for QR, fallback to token
      const nonce = data.value || data.nonce || data.token || null;
      await generateQRForPseudo(pseudonym, null, nonce);
    } catch (err) {
      console.error(err);
      setSectionStatus(newBarberStatus, 'Network error during barber creation.', 'red');
    } finally {
      disableButton(createNewBarberBtn, false);
    }
  });

  // ---------- QR generation helper ----------
  async function generateQRForPseudo(pseudonym, logoFile, nonce) {
    qrContainer.innerHTML = '';
    let qrUrl = `${location.origin}/?barber=${encodeURIComponent(pseudonym)}`;
    if (nonce) qrUrl += `&qr=${encodeURIComponent(nonce)}`;

    const size = 1200;
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const ctx = off.getContext('2d');

    await new Promise((res, rej) => QRCode.toCanvas(off, qrUrl, { width: size }, err => err ? rej(err) : res()));

    if (logoFile) {
      const reader = new FileReader();
      await new Promise((res, rej) => { reader.onload = res; reader.onerror = rej; reader.readAsDataURL(logoFile); });
      const logoDataUrl = reader.result;
      const logoImg = await loadImageFromDataUrl(logoDataUrl);
      const logoSize = Math.floor(size * 0.18);
      ctx.drawImage(logoImg, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize);
    }

    const display = document.createElement('canvas');
    display.width = display.height = 360;
    display.getContext('2d').drawImage(off, 0, 0, 360, 360);
    qrContainer.appendChild(display);

    addDownloadLinkFromCanvas(off, `${pseudonym}_qr.png`);
  }

  function addDownloadLinkFromCanvas(canvas, filename) {
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.textContent = 'Download PNG';
      a.className = 'link-btn';
      a.style.display = 'inline-block';
      a.style.marginTop = '10px';
      qrContainer.appendChild(a);
    }, 'image/png');
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = dataUrl;
    });
  }

});