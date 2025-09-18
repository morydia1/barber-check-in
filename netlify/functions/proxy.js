// netlify/functions/proxy.js
import fetch from "node-fetch";

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod === "POST") {
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbweususVDQz0994_yxRJIGZzTdA1HFH8-1wdk89dJXoSnX2ZxngIIDvE87RpLYqd99A/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
    });

      const data = await response.text();

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: data,
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: err.toString() }),
      };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
}