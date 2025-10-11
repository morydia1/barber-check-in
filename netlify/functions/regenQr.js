// netlify/functions/regenQr.js
export async function handler(event, context) {
  // Expect POST with { pseudonym, adminToken }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const pseudonym = (body.pseudonym || '').trim();
    const adminToken = (body.adminToken || '').trim();
    const authEmail = (body.authEmail || '').trim().toLowerCase();
    const authToken = (body.authToken || '').trim();

    if (!pseudonym) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'pseudonym required' }) };
    }

    // verify admin token either by shared adminToken OR authEmail+authToken matching ADMIN_EMAIL/ADMIN_TOKEN
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
    let authorized = false;
    if (ADMIN_TOKEN && adminToken && adminToken === ADMIN_TOKEN) authorized = true;
    if (ADMIN_TOKEN && ADMIN_EMAIL && authEmail && authToken && authEmail === ADMIN_EMAIL && authToken === ADMIN_TOKEN) authorized = true;

    if (!authorized) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'APPS_SCRIPT_URL not set' }) };
    }

    // Call Apps Script regenqr endpoint (doGet)
  const url = `${APPS_SCRIPT_URL}?action=regenqr&pseudo=${encodeURIComponent(pseudonym)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.success) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: data.error || 'Failed to regen QR' }) };
    }

    // Apps Script returns { success: true, field, value } — normalize to 'value' and include 'nonce' for compatibility
    const value = data.value || data.nonce || null;
    return { statusCode: 200, body: JSON.stringify({ success: true, value: value, nonce: value }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
}
