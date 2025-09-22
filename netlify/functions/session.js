// netlify/functions/session.js
import { addToken } from './proxy.js';

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

    // Check if barber exists in registry
    const url = `${APPS_SCRIPT_URL}?action=getbarberbypseudo&pseudo=${encodeURIComponent(barber)}`;
    const res = await fetch(url);
    const info = await res.json();

    if (!info || !info.success || !info.barber) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Barber not found' }) };
    }

    // Generate a one-time session token
    const token = generateSecureToken(10);

    // Add token to validTokens set in proxy.js
    addToken(token);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
};

function generateSecureToken(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
