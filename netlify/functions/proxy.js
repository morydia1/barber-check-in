// netlify/functions/proxy.js
export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { barber, name, phone, email, ageRange, token } = body;

    if (!barber || !name || !phone || !ageRange || !token) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Missing required fields or token' })
      };
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'APPS_SCRIPT_URL not set' })
      };
    }

    // Check & consume token in Apps Script
    const tokenCheckUrl = `${APPS_SCRIPT_URL}?action=checktoken&barber=${encodeURIComponent(barber)}&token=${encodeURIComponent(token)}`;
    const tokenRes = await fetch(tokenCheckUrl);
    const tokenJson = await tokenRes.json();

    if (!tokenJson || !tokenJson.valid) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Invalid or expired session token' })
      };
    }

    // Forward check-in to Apps Script (use POST)
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'checkin',
        barber,
        name,
        phone,
        email,
        ageRange
      })
    });

    const json = await res.json();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.toString() })
    };
  }
}
