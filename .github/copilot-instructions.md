## Quick orientation for AI coding agents

This small project implements a QR-driven walk-in check-in flow with a tiny admin UI and a set of Netlify serverless functions that bridge to a Google Apps Script backend (spreadsheet registry + token store). The goal of these notes is to give an agent the concrete, discoverable facts needed to make safe, correct edits.

Highlights
- Frontend: `index.html` + `script.js` — customer-facing QR check-in page.
- Admin UI: `admin.html` + `admin.js` — sign-in (admin or barber), generate/rotate QR, add barber.
- Serverless: `netlify/functions/*` — functions act as a thin proxy and orchestration layer to an Apps Script API (external). Key functions: `session`, `proxy`, `auth`, `lookup`, `addBarber`, `regenQr`.
- External dependency: `APPS_SCRIPT_URL` environment variable — every function calls this URL with `?action=...` query parameters to perform registry, token, and checkin operations.

Big-picture data & control flows
- QR encoding: the printed QR encodes a URL like `https://<host>/?barber=<pseudonym>&qr=<nonce>` (see `admin.js` QR generation). The `qr` query param is a nonce used to validate that the scanned QR is current.
- Session creation: `script.js` calls GET `/.netlify/functions/session?barber=<pseudo>&qr=<nonce>`. The function validates the nonce against the Apps Script registry and, on success, generates a one-time session token and calls the Apps Script `storetoken` action. The page receives `{ success: true, token }` and uses that token when submitting the check-in.
- Check-in submission: the customer form sends POST to `/.netlify/functions/proxy` with JSON: { barber, name, phone, email, ageRange, token }. `proxy` verifies the token with Apps Script (`action=checktoken`) and forwards the check-in via POST `action=checkin`.
- Admin & rotation: `admin.js` signs in via POST `/.netlify/functions/auth` (body: { email, token }). Admin flow can call rotation endpoints and create new barbers. `addBarber` posts to Apps Script `action=addBarber` and returns `sheetUrl`, `token`, `qrNonce`. `regenQr` calls Apps Script `action=regenqr` to obtain a new nonce.

Important files to inspect when changing behavior
- `index.html` and `script.js` — check-in UX, session/token lifecycle, and form payload shape.
- `admin.html` and `admin.js` — QR generation (uses `qrcode` CDN), admin UI flows, and how the client calls serverless endpoints.
- `netlify/functions/*.js` — see server-side validation and how environment variables are used (`APPS_SCRIPT_URL`, `ADMIN_EMAIL`, `ADMIN_TOKEN`). These files are the canonical source of what the backend expects/returns.
- `netlify/functions/proxy.js` — core of check-in forwarding and token validation; includes CORS headers.
- `netlify.toml` — functions dir configuration for Netlify (publish = ".", functions = "netlify/functions").

Environment & local dev hints
- Required environment variables (Netlify env or local):
  - APPS_SCRIPT_URL — URL of the Google Apps Script web app endpoints (required by all functions).
  - ADMIN_EMAIL — optional admin email used by `auth.js`.
  - ADMIN_TOKEN — shared secret for admin actions (used by `auth.js` and `regenQr.js`).
- Local development: the project has no package.json or framework. Use the Netlify CLI for a local dev server that runs functions: `netlify dev` (ensure the above env vars are set). If you can't run Apps Script during local dev, stub `APPS_SCRIPT_URL` to a small local HTTP server that returns the same JSON shapes used in the functions.

API shapes and examples (copyable patterns)
- Session (GET): `/.netlify/functions/session?barber=barber-pseudo&qr=nonce` -> returns `{ success: true, token }` on success.
- Proxy (POST): body `{ barber, name, phone, email, ageRange, token }` -> forwards to Apps Script `action=checkin` and returns Apps Script JSON.
- Auth (POST): body `{ email, token }` -> returns `{ role: 'admin' }` or `{ role: 'barber', pseudonym }` when valid.

Project-specific conventions / gotchas discovered
- Apps Script integration pattern: functions call the single `APPS_SCRIPT_URL` with different `action` query parameters (e.g., `?action=getbarberbyemail`, `?action=getbarberbypseudo`, `?action=regenqr`, `?action=storetoken`). When editing functions, preserve these query-param-based contracts.
- JSON contract expectations: client code expects JSON payloads and checks `.ok` / `.success` fields. Most functions return a JSON body string and proper status codes — preserve both.
- Token lifecycle:
  - Printed QR contains a barber pseudo + nonce.
  - `session` validates nonce and creates one-time session tokens (stored by Apps Script).
  - `proxy` consumes session token via Apps Script `checktoken` before forwarding check-in.

Discovery: two small inconsistencies to be aware of (fixing these is safe and recommended)
- regen payload key mismatch: `admin.js` sends { pseudonym, authEmail, authToken } to `/.netlify/functions/regenQr`, but `netlify/functions/regenQr.js` looks for `body.adminToken`. Align on one field name (recommend `adminToken` or `token`).
- regen response shape mismatch: `netlify/functions/regenQr.js` returns `{ success: true, nonce: data.nonce }` while `admin.js` expects `regenRes.token` (and uses that value to generate the QR). Decide whether the field should be `token` or `nonce` and make both sides match.

If you're an AI assistant editing code
- Prefer changing function payload/response names in small, backwards-compatible ways: e.g., accept both `authToken` and `adminToken` in `regenQr.js` while updating clients to the single agreed name.
- Add unit-like smoke checks after changes: load `admin.html` and `index.html` in a browser and run the flows against a stubbed `APPS_SCRIPT_URL` to verify the JSON shapes. The codebase is lightweight — end-to-end testing can be done with `curl` or a small node script that stubs Apps Script.

Where to look next for context or fixes
- If you need to modify registry/token behavior inspect the Apps Script code that backs `APPS_SCRIPT_URL` (not included in this repo). The Netlify functions depend on specific query params and return shapes from that script.
- To add automated local tests, create a minimal Express mock for `APPS_SCRIPT_URL` that returns the same JSON structures and run Netlify dev against it.

Questions
- I standardized the findings and added concrete examples. Would you like me to (a) normalize the `regenQr` request/response keys and update `admin.js` accordingly, or (b) implement a tolerant server-side shim that accepts both names and returns both `nonce` and `token`? Reply with your preference and I'll make the change.
