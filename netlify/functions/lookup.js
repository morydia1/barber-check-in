// netlify/functions/lookup.js
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const email = (body.email || '').toLowerCase().trim();
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) };

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) return { statusCode: 500, body: JSON.stringify({ error: 'APPS_SCRIPT_URL not set' }) };

    const url = `${APPS_SCRIPT_URL}?action=getbarberbyemail&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    const info = await res.json();

    if (!info || !info.success) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Barber not found' }) };
    }

    const barber = info.barber || {};
    const safe = {
      pseudonym: barber.pseudonym || null,
      email: barber.email || null,
      displayName: barber.displayName || null,
      qrNonce: barber.qrNonce || null
    };

    return { statusCode: 200, body: JSON.stringify(safe) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.toString() }) };
  }
}
