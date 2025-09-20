// script.js
let selectedAge = null;
document.querySelectorAll('.age-group button').forEach(b => {
  b.addEventListener('click', () => {
    selectedAge = b.dataset.value;
    document.querySelectorAll('.age-group button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
  });
});

document.getElementById('checkinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('status');
  status.textContent = '';
  status.style.color = 'black';

  const params = new URLSearchParams(window.location.search);
  const barber = params.get('barber');
  if (!barber) { status.textContent = 'Barber not found.'; return; }

  const data = {
    barber,
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    ageRange: selectedAge
  };

  // Validation
  if (!data.name || !data.phone || !data.ageRange) {
    status.style.color = 'red';
    status.textContent = 'Please fill required fields.';
    return;
  }

  try {
    const res = await fetch('/.netlify/functions/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json && json.success) {
      status.style.color = 'green';
      status.textContent = '✅ Checked in! Thanks.';
      document.getElementById('checkinForm').reset();
      selectedAge = null;
      document.querySelectorAll('.age-group button').forEach(x => x.classList.remove('selected'));
    } else {
      status.style.color = 'red';
      status.textContent = 'Error saving. Try again later.';
    }
  } catch (err) {
    console.error(err);
    status.style.color = 'red';
    status.textContent = 'Network error. Try again.';
  }
});
