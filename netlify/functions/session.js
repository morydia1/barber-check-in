// netlify/functions/session.js
// Generates a one-time token for a scanned QR code

export async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const params = event.queryStringParameters || {};
    const barber = (params.barber || '').trim();
    if (!barber) return { statusCode: 400, body: JSON.stringify({ error: 'Missing barber parameter' }) };

    // create a short-lived random token
    const token = Array.from({ length: 10 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('');

    // store in-memory for demo (in production, use DB / KV store)
    globalThis.sessions = globalThis.sessions || {};
    globalThis.sessions[token] = { barber, expires: Date.now() + 3 * 60 * 1000 }; // 5 min expiry

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.toString() }) };
  }
}
