// netlify/functions/proxy.js
// Simple in-memory store for demo; in production use DB/Redis for persistent token validation
const usedTokens = new Set();

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

    // Check if token was already used
    if (usedTokens.has(token)) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Session token already used' })
      };
    }

    // Mark token as used immediately
    usedTokens.add(token);

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'APPS_SCRIPT_URL not set' })
      };
    }

    // Forward data to Apps Script
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