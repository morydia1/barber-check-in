// netlify/functions/auth.js
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const email = (body.email || '').toLowerCase();
    const token = body.token || '';

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return { statusCode: 500, body: JSON.stringify({ error: 'APPS_SCRIPT_URL not set' }) };
    }

    // Fetch barber info from Apps Script registry endpoint
    const url = `${APPS_SCRIPT_URL}?action=getbarberbyemail&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    const info = await res.json();

    // Admin check using Netlify env vars
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

    if (email === ADMIN_EMAIL && token === ADMIN_TOKEN) {
      return { statusCode: 200, body: JSON.stringify({ role: 'admin', email }) };
    }

    if (!info || !info.success) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Not subscribed' }) };
    }

    const barber = info.barber || null;
    if (barber) {
      const expectedToken = String(barber.token || '');
      // if token exists, require it; if blank, email-only is enough
      if (!expectedToken || expectedToken === token) {
        return { statusCode: 200, body: JSON.stringify({ role: 'barber', email, pseudonym: barber.pseudonym }) };
      } else {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
      }
    }

    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.toString() }) };
  }
}
