// addBarber.js - Netlify Function to create a new barber
// Front-end admin form calls this function

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
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

    // Apps Script Web App URL (deployed as Web App, exec mode)
    const APPSCRIPT_URL = process.env.APPSCRIPT_URL; 
    if (!APPSCRIPT_URL) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Apps Script URL not configured' }) };
    }

    // Call Apps Script createBarberAutomated via POST
    const res = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createBarber', // optional, for Apps Script to distinguish calls
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
      body: JSON.stringify({ success: true, sheetUrl: data.sheetUrl, sheetId: data.sheetId, token: data.token })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.toString() }) };
  }
};
