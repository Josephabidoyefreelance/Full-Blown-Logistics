JAAD ERP CALL CENTRE — JSON/API ERROR FIX

This package includes the Twilio Voice integration files plus a fix for the exact error:
Unexpected token '<', "<!DOCTYPE "... is not valid JSON

The call panel now handles HTML/non-JSON API responses safely and displays a useful message instead of crashing while parsing JSON.

INSTALL
1. Back up your existing app/support/call-panel.tsx.
2. Copy the files in this package into the matching locations in your project, preserving the folders:
   app/support/call-panel.tsx
   app/api/twilio/token/route.ts
   app/api/twilio/voice/route.ts
   app/api/twilio/status/route.ts
3. Open actions-logSupportCall.patch.ts and apply its small change to the existing logSupportCall function in app/support/actions.ts. Do NOT replace your entire actions.ts file.
4. Ensure npm install twilio @twilio/voice-sdk has completed.
5. Set Twilio credentials in .env.local only. Never put credentials in client-side code or share them in chat.
6. Stop and restart the dev server: Ctrl+C, then npm run dev.
7. If the error message says the API route returned HTML, check the terminal where npm run dev is running. The improved message also tells you if the route is missing.

REQUIRED SERVER-ONLY ENVIRONMENT VARIABLES
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_AUTH_TOKEN=
TWILIO_TWIML_APP_SID=
TWILIO_CALLER_ID=

IMPORTANT
- This patch was not built against your complete local project, because that project folder is not available in this session. It fixes the unsafe JSON parsing and includes the needed route files, but it is not represented as a verified end-to-end call test.
- TwiML App Voice Request URL must point to your public HTTPS host at /api/twilio/voice (POST). Localhost alone is not reachable by Twilio.
- The included voice route does not validate Twilio request signatures. Treat this as a development patch, not production-ready until signature validation and rate limiting are added.
- If you previously pasted Twilio secrets in chat, rotate them before using them.
