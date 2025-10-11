// netlify/functions/addBarber.js
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { displayName, pseudonym, email, phone } = JSON.parse(event.body || '{}');

    if (!displayName || !pseudonym || !email || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'displayName, pseudonym, email and phone required' })
      };
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Apps Script URL not configured' }) };
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addBarber',
        pseudonym: pseudonym,
        email: email,
        phone: phone,
        displayName: displayName
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: data.error || 'Failed to create barber' })
      };
    }

    // Normalize Apps Script response: it may return { value } or { nonce }
    const nonce = data.value || data.nonce || data.qrNonce || null;
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sheetUrl: data.sheetUrl, sheetId: data.sheetId, token: data.token, nonce })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
}
