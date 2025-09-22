// netlify/functions/session.js
export async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const params = event.queryStringParameters || {};
    const barber = (params.barber || '').trim();
    if (!barber) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing barber pseudonym' }) };
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'APPS_SCRIPT_URL not set' }) };
    }

    // Verify barber exists
    const checkUrl = `${APPS_SCRIPT_URL}?action=getbarberbypseudo&pseudo=${encodeURIComponent(barber)}`;
    const checkRes = await fetch(checkUrl);
    const checkJson = await checkRes.json();
    if (!checkJson || !checkJson.success || !checkJson.barber) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Barber not found' }) };
    }

    // Generate token
    const token = generateSecureToken(10);

    // Store token in Apps Script tokens sheet
    const storeUrl = `${APPS_SCRIPT_URL}?action=storetoken&barber=${encodeURIComponent(barber)}&token=${encodeURIComponent(token)}`;
    await fetch(storeUrl);

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
