// netlify/functions/addBarber.js
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { displayName, pseudonym, email } = JSON.parse(event.body || '{}');

    if (!displayName || !pseudonym || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'displayName, pseudonym, and email required' })
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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sheetUrl: data.sheetUrl, sheetId: data.sheetId, token: data.token, qrNonce: data.qrNonce })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
}
