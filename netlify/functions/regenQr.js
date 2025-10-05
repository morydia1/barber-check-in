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

    if (!pseudonym || !adminToken) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'pseudonym and adminToken required' }) };
    }

    // verify admin token (simple shared-secret)
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
    if (!ADMIN_TOKEN || adminToken !== ADMIN_TOKEN) {
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

    // returns { success: true, nonce: '...' }
    return { statusCode: 200, body: JSON.stringify({ success: true, nonce: data.nonce }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
}
