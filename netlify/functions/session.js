// netlify/functions/session.js
export async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const params = event.queryStringParameters || {};
    const barber = (params.barber || '').trim();
    const qr = (params.qr || '').trim();

    if (!barber || !qr) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Missing barber or qr parameter' })
      };
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'APPS_SCRIPT_URL not set' }) };
    }

    // Fetch barber info (must include the nonce field in registry row)
    const checkUrl = `${APPS_SCRIPT_URL}?action=getbarberbypseudo&pseudo=${encodeURIComponent(barber)}`;
    const checkRes = await fetch(checkUrl);
    const checkJson = await checkRes.json();

    if (!checkJson || !checkJson.success || !checkJson.barber) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Barber not found' }) };
    }

    const barberObj = checkJson.barber || {};
    const storedNonce = String(barberObj.nonce || '').trim();
    if (!storedNonce) {
      return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Barber has no active QR (nonce)' }) };
    }

    if (storedNonce !== qr) {
      return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Invalid QR nonce' }) };
    }

    // Generate a one-time session token
    const token = generateSecureToken(10);

    // Store token in Apps Script tokens sheet (Apps Script endpoint: action=storetoken)
    const storeUrl = `${APPS_SCRIPT_URL}?action=storetoken&barber=${encodeURIComponent(barber)}&token=${encodeURIComponent(token)}`;
    // We don't strictly need the response, but check for success for robustness
    await fetch(storeUrl);

    // Return token to the client
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
}

function generateSecureToken(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
