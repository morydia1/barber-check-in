// admin.js - login + QR generator (uses server-side registry lookup & auth)
// Requires admin.html to have elements with these IDs:
// loginModal, loginEmail, loginToken, loginBtn, loginStatus, qrApp,
// adminView, barberView, barberEmail, adminLogo, adminStatus, barberLogo,
// generateAdminQR, generateBarberQR, qr-container

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const loginModal = document.getElementById('loginModal');
  const loginBtn = document.getElementById('loginBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginToken = document.getElementById('loginToken');
  const loginStatus = document.getElementById('loginStatus');

  const qrApp = document.getElementById('qrApp');
  const adminView = document.getElementById('adminView');
  const barberView = document.getElementById('barberView');
  const adminStatus = document.getElementById('adminStatus');
  const qrContainer = document.getElementById('qr-container');

  const barberEmailInput = document.getElementById('barberEmail');
  const adminLogoInput = document.getElementById('adminLogo');
  const barberLogoInput = document.getElementById('barberLogo');
  const generateAdminBtn = document.getElementById('generateAdminQR');
  const generateBarberBtn = document.getElementById('generateBarberQR');

  // runtime state
  let currentRole = null;
  let currentEmail = null;
  let currentPseudonym = null; // populated for barbers

  // ----- Login -----
  loginBtn.addEventListener('click', async () => {
    loginStatus.style.color = '#333';
    loginStatus.textContent = 'Verifying…';
    loginBtn.disabled = true;

    const email = (loginEmail.value || '').trim().toLowerCase();
    const token = (loginToken.value || '').trim();

    if (!email) {
      loginStatus.style.color = 'red';
      loginStatus.textContent = 'Please enter your email.';
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
        loginStatus.style.color = 'red';
        loginStatus.textContent = payload.error || 'Unauthorized';
        loginBtn.disabled = false;
        return;
      }

      // success: payload.role is 'admin' or 'barber'
      currentRole = payload.role;
      currentEmail = email;
      currentPseudonym = payload.pseudonym || null;

      // show correct UI
      loginModal.style.display = 'none';
      qrApp.style.display = 'block';
      if (currentRole === 'admin') {
        adminView.style.display = 'block';
        barberView.style.display = 'none';
      } else {
        adminView.style.display = 'none';
        barberView.style.display = 'block';
      }

      loginBtn.disabled = false;
      loginStatus.textContent = '';

    } catch (err) {
      console.error('auth error', err);
      loginStatus.style.color = 'red';
      loginStatus.textContent = 'Network error — try again';
      loginBtn.disabled = false;
    }
  });

  // ----- Admin generates a QR for any barber (lookup by email, get pseudonym) -----
  generateAdminBtn?.addEventListener('click', async () => {
    adminStatus.style.color = '#333';
    adminStatus.textContent = 'Looking up barber…';
    qrContainer.innerHTML = '';

    const barberEmail = (barberEmailInput.value || '').trim().toLowerCase();
    const logoFile = adminLogoInput.files[0] || null;

    if (!barberEmail) {
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Enter a barber email.';
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: barberEmail })
      });

      const info = await res.json();
      if (!res.ok) {
        adminStatus.style.color = 'red';
        adminStatus.textContent = info.error || 'Barber not found in registry.';
        return;
      }

      const pseudonym = info.pseudonym;
      if (!pseudonym) {
        adminStatus.style.color = 'red';
        adminStatus.textContent = 'Barber has no pseudonym configured.';
        return;
      }

      adminStatus.textContent = 'Generating QR…';
      await generateQRForPseudo(pseudonym, logoFile);
      adminStatus.style.color = 'green';
      adminStatus.textContent = 'QR ready — save or download below.';

    } catch (err) {
      console.error('lookup error', err);
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Network error during lookup.';
    }
  });

  // ----- Barber generates their own QR -----
  generateBarberBtn?.addEventListener('click', async () => {
    adminStatus.style.color = '#333';
    adminStatus.textContent = 'Generating your QR…';
    qrContainer.innerHTML = '';

    // currentPseudonym must be provided by auth
    if (!currentPseudonym) {
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Your account is missing a pseudonym in the registry.';
      return;
    }

    const logoFile = barberLogoInput.files[0] || null;
    try {
      await generateQRForPseudo(currentPseudonym, logoFile);
      adminStatus.style.color = 'green';
      adminStatus.textContent = 'QR ready — save or download below.';
    } catch (err) {
      console.error('generate error', err);
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Error generating QR.';
    }
  });

  // ----- Helper: generate QR and show download link -----
  async function generateQRForPseudo(pseudonym, logoFile) {
    qrContainer.innerHTML = ''; // clear
    const qrOrigin = location.origin; // works in production and local
    const qrUrl = `${qrOrigin}/?barber=${encodeURIComponent(pseudonym)}`;

    // if no logo -> simple canvas
    if (!logoFile) {
      const canvas = document.createElement('canvas');
      canvas.style.maxWidth = '300px';
      qrContainer.appendChild(canvas);
      await new Promise((resolve, reject) => {
        QRCode.toCanvas(canvas, qrUrl, { width: 600 }, (err) => {
          if (err) reject(err); else resolve();
        });
      });
      addDownloadLinkFromCanvas(canvas, `${pseudonym}_qr.png`);
      return;
    }

    // with logo: draw large QR then overlay logo, then produce visible small canvas + downloadable PNG
    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onload = () => resolve();
      reader.onerror = reject;
      reader.readAsDataURL(logoFile);
    });
    const logoDataUrl = reader.result;

    // create large offscreen canvas for good quality
    const size = 1200;
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const ctx = off.getContext('2d');

    await new Promise((resolve, reject) => {
      QRCode.toCanvas(off, qrUrl, { width: size }, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    // draw logo on center
    const logoImg = await loadImageFromDataUrl(logoDataUrl);
    const logoSize = Math.floor(size * 0.18); // 18% of QR
    ctx.drawImage(logoImg, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize);

    // create a display canvas (smaller)
    const display = document.createElement('canvas');
    const displaySize = 360;
    display.width = displaySize; display.height = displaySize;
    display.getContext('2d').drawImage(off, 0, 0, displaySize, displaySize);
    qrContainer.appendChild(display);

    // also attach full-size download link
    addDownloadLinkFromCanvas(off, `${pseudonym}_qr.png`);
  }

  // helper: add a download link next to a canvas (blob)
  function addDownloadLinkFromCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.textContent = 'Download PNG';
      a.className = 'link-btn';
      a.style.display = 'inline-block';
      a.style.marginTop = '10px';
      qrContainer.appendChild(a);
    }, 'image/png');
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
});
