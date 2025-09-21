document.addEventListener('DOMContentLoaded', () => {
  // ---- DOM elements ----
  const loginModal = document.getElementById('loginModal');
  const loginBtn = document.getElementById('loginBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginToken = document.getElementById('loginToken');
  const loginStatus = document.getElementById('loginStatus');

  const qrApp = document.getElementById('qrApp');
  const adminView = document.getElementById('adminView');
  const barberView = document.getElementById('barberView');
  const newBarberView = document.getElementById('newBarberView');
  const adminStatus = document.getElementById('adminStatus');
  const barberStatus = document.getElementById('barberStatus');
  const qrContainer = document.getElementById('qr-container');

  const barberEmailInput = document.getElementById('barberEmail');
  const barberHeading = document.getElementById('barberHeading');
  const adminLogoInput = document.getElementById('adminLogo');
  const barberLogoInput = document.getElementById('barberLogo');
  const generateAdminBtn = document.getElementById('generateAdminQR');
  const generateBarberBtn = document.getElementById('generateBarberQR');

  const newBarberDisplayNameInput = document.getElementById('newBarberDisplayName');
  const newBarberPseudoInput = document.getElementById('newBarberPseudo');
  const newBarberEmailInput = document.getElementById('newBarberEmail');
  const createNewBarberBtn = document.getElementById('createNewBarber');
  const newBarberStatus = document.getElementById('newBarberStatus');

  let currentRole = null;
  let currentEmail = null;
  let currentPseudonym = null;

  // ---- Login ----
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

      currentRole = payload.role;
      currentEmail = email;
      currentPseudonym = payload.pseudonym || null;

      loginModal.style.display = 'none';
      qrApp.style.display = 'block';
      adminView.style.display = currentRole==='admin' ? 'block':'none';
      barberView.style.display = currentRole==='barber' ? 'block':'none';
      newBarberView.style.display = currentRole==='admin' ? 'block':'none';

      if (currentRole === 'barber' && currentPseudonym) {
        barberHeading.textContent = `${currentPseudonym} QR Code`;
      }
      
      loginBtn.disabled = false;
      loginStatus.textContent = '';

    } catch (err) {
      console.error(err);
      loginStatus.style.color = 'red';
      loginStatus.textContent = 'Network error — try again';
      loginBtn.disabled = false;
    }
  });

  // ---- Generate QR for existing barber (admin) ----
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
      if (!info.pseudonym) {
        adminStatus.style.color = 'red';
        adminStatus.textContent = 'Barber has no pseudonym configured.';
        return;
      }
      adminStatus.textContent = 'Generating QR…';
      await generateQRForPseudo(info.pseudonym, logoFile);
      adminStatus.style.color = 'green';
      adminStatus.textContent = 'QR ready — save or download below.';
    } catch (err) {
      console.error(err);
      adminStatus.style.color = 'red';
      adminStatus.textContent = 'Network error during lookup.';
    }
  });

  // ---- Generate QR for barber (self) ----
  generateBarberBtn?.addEventListener('click', async () => {
    barberStatus.style.color = '#333';
    barberStatus.textContent = 'Generating your QR…';
    qrContainer.innerHTML = '';
    if (!currentPseudonym) {
      barberStatus.style.color='red';
      barberStatus.textContent='Your account is missing a pseudonym.';
      return;
    }
    await generateQRForPseudo(currentPseudonym, barberLogoInput.files[0]||null);
    barberStatus.style.color='green';
    barberStatus.textContent='QR ready — save or download below.';
  });

  // ---- Create New Barber ----
  createNewBarberBtn?.addEventListener('click', async () => {
    newBarberStatus.style.color = '#333';
    newBarberStatus.textContent = 'Creating barber…';

    const displayName = newBarberDisplayNameInput.value.trim();
    const pseudonym = newBarberPseudoInput.value.trim();
    const email = newBarberEmailInput.value.trim().toLowerCase();
    if (!displayName || !pseudonym || !email) {
      newBarberStatus.style.color = 'red';
      newBarberStatus.textContent = 'All fields are required.';
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/addBarber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, pseudonym, email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        newBarberStatus.style.color='red';
        newBarberStatus.textContent = data.error||'Failed to create barber.';
        return;
      }
      newBarberStatus.style.color='green';
      newBarberStatus.innerHTML=`Barber created! Sheet: <a href="${data.sheetUrl}" target="_blank">${data.sheetUrl}</a><br>Token: ${data.token}`;

      // optionally generate QR for new barber
      await generateQRForPseudo(pseudonym, null);
    } catch(err) {
      console.error(err);
      newBarberStatus.style.color='red';
      newBarberStatus.textContent='Network error during barber creation.';
    }
  });

  // ---- QR Helper ----
  async function generateQRForPseudo(pseudonym, logoFile) {
    qrContainer.innerHTML='';
    const qrUrl = `${location.origin}/?barber=${encodeURIComponent(pseudonym)}`;
    if (!logoFile) {
      const canvas = document.createElement('canvas');
      canvas.style.maxWidth='300px';
      qrContainer.appendChild(canvas);
      await new Promise((res,rej)=>QRCode.toCanvas(canvas, qrUrl, {width:600}, err=>err?rej(err):res()));
      addDownloadLinkFromCanvas(canvas, `${pseudonym}_qr.png`);
      return;
    }

    const reader = new FileReader();
    await new Promise((res,rej)=>{reader.onload=res; reader.onerror=rej; reader.readAsDataURL(logoFile)});
    const logoDataUrl = reader.result;
    const size = 1200;
    const off = document.createElement('canvas'); off.width=off.height=size;
    const ctx = off.getContext('2d');
    await new Promise((res,rej)=>QRCode.toCanvas(off, qrUrl, {width:size}, err=>err?rej(err):res()));
    const logoImg = await loadImageFromDataUrl(logoDataUrl);
    const logoSize = Math.floor(size*0.18);
    ctx.drawImage(logoImg,(size-logoSize)/2,(size-logoSize)/2,logoSize,logoSize);
    const display = document.createElement('canvas'); display.width=display.height=360;
    display.getContext('2d').drawImage(off,0,0,360,360);
    qrContainer.appendChild(display);
    addDownloadLinkFromCanvas(off, `${pseudonym}_qr.png`);
  }

  function addDownloadLinkFromCanvas(canvas, filename){
    canvas.toBlob(blob=>{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=filename;
      a.textContent='Download PNG';
      a.className='link-btn';
      a.style.display='inline-block';
      a.style.marginTop='10px';
      qrContainer.appendChild(a);
    },'image/png');
  }

  function loadImageFromDataUrl(dataUrl){
    return new Promise((res,rej)=>{
      const img=new Image();
      img.onload=()=>res(img);
      img.onerror=rej;
      img.src=dataUrl;
    });
  }
});
