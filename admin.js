// admin.js – handles login + QR generation

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

  let currentRole = null;
  let currentEmail = null;
  let currentPseudonym = null;

  // ----- LOGIN -----
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

      if (!res.ok || !payload.role) {
        loginStatus.style.color = 'red';
        loginStatus.textContent = payload.error || 'Unauthorized';
        loginBtn.disabled = false;
        return;
      }

      // success
      currentRole = payload.role;
      currentEmail = email;
      currentPseudonym = payload.pseudonym || null;

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
      console.error('Auth error', err);
      loginStatus.style.color = 'red';
      loginStatus.textContent = 'Network error — try again';
      loginBtn.disabled = false;
    }
  });

  // ----- GENERATE QR (Admin) -----
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

      if (!res.ok || !info.pseudonym) {
        adminStatus.style.color = 'red';
        adminStatus.textContent = info.error || 'Barber not found in registry.';
        return;
      }

      const pseudonym = info.pseudonym;
      adminStatus.textContent = 'Generating QR…';
      await generateQRForPseudo(pseudonym, logoFile);
      adminStatus.style.color = 'green';
      adminStatus.textContent = 'QR ready — save or download below.';

    } catch (err) {
      console.error('Lookup error', err);
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Network error during lookup.';
    }
  });

  // ----- GENERATE QR (Barber) -----
  generateBarberBtn?.addEventListener('click', async () => {
    adminStatus.style.color = '#333';
    adminStatus.textContent = 'Generating your QR…';
    qrContainer.innerHTML = '';

    if (!currentPseudonym) {
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Your account is missing a pseudonym.';
      return;
    }

    const logoFile = barberLogoInput.files[0] || null;
    try {
      await generateQRForPseudo(currentPseudonym, logoFile);
      adminStatus.style.color = 'green';
      adminStatus.textContent = 'QR ready — save or download below.';
    } catch (err) {
      console.error('QR generate error', err);
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Error generating QR.';
    }
  });

  // ----- HELPER: Generate QR for pseudonym -----
  async function generateQRForPseudo(pseudonym, logoFile) {
    qrContainer.innerHTML = '';
    const qrUrl = `${location.origin}/?barber=${encodeURIComponent(pseudonym)}`;

    // Simple QR if no logo
    if (!logoFile) {
      const canvas = document.createElement('canvas');
      canvas.style.maxWidth = '300px';
      qrContainer.appendChild(canvas);
      await new Promise((resolve, reject) => {
        QRCode.toCanvas(canvas, qrUrl, { width: 600 }, (err) => err ? reject(err) : resolve());
      });
      addDownloadLink(canvas, `${pseudonym}_qr.png`);
      return;
    }

    // With logo overlay
    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onload = () => resolve();
      reader.onerror = reject;
      reader.readAsDataURL(logoFile);
    });

    const logoDataUrl = reader.result;
    const size = 1200;
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const ctx = off.getContext('2d');

    await new Promise((resolve, reject) => {
      QRCode.toCanvas(off, qrUrl, { width: size }, (err) => err ? reject(err) : resolve());
    });

    const logoImg = await loadImageFromDataUrl(logoDataUrl);
    const logoSize = Math.floor(size * 0.18);
    ctx.drawImage(logoImg, (size - logoSize)/2, (size - logoSize)/2, logoSize, logoSize);

    const display = document.createElement('canvas');
    const displaySize = 360;
    display.width = display.height = displaySize;
    display.getContext('2d').drawImage(off, 0, 0, displaySize, displaySize);
    qrContainer.appendChild(display);

    addDownloadLink(off, `${pseudonym}_qr.png`);
  }

  function addDownloadLink(canvas, filename) {
    canvas.toBlob(blob => {
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
