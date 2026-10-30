JAAD ERP — SMS FIX V2 (targeted SMS-only patch)
=================================================

You are right to expect two separate things to work:
1. The UI must NOT label a message as delivered just because Twilio accepted the request.
2. The UI must be compact and incoming SMS must reach Inbox.

This package tightens the compose form and message rows, shows honest delivery status, preserves error codes, and includes inbound/status webhook routes. It does not redesign the rest of the Support page.

BACK UP FIRST
Copy your current page.tsx, sms-panel.tsx and actions.ts to a backup folder before replacing anything.

FILES
1. sms-panel-fixed.tsx -> src/app/(app)/support/sms-panel.tsx
2. actions-sms-fixed.ts -> src/app/(app)/support/actions.ts
   This retains the actions from the file you supplied and changes only SMS sending logic.
3. support-page-sms.patch -> apply ONLY to src/app/(app)/support/page.tsx.
   Do not replace the whole page with a different page file. The patch only expands the SMS query and passes SMS inbox/history/contacts into SmsPanel.
   If you don't know how to apply a patch, do not manually edit lines: send your current page.tsx and I can return a merged file based on that exact version.
4. api/twilio/sms/route.ts -> src/app/api/twilio/sms/route.ts
5. api/twilio/sms/status/route.ts -> src/app/api/twilio/sms/status/route.ts
6. Run sms-migration.sql in Supabase SQL Editor.

ENVIRONMENT VARIABLES
Required on the server:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_SMS_FROM (must be a Twilio sender that supports SMS, not just a voice-verified caller ID)
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-side only; never use NEXT_PUBLIC_ for this secret)
- NEXT_PUBLIC_APP_URL=https://YOUR-PUBLIC-DEPLOYED-DOMAIN (no trailing slash)

CRITICAL: LOCALHOST CANNOT RECEIVE TWILIO WEBHOOKS
Your browser screenshot shows http://localhost:3000/support?view=sms. Twilio's servers cannot call localhost on your computer. For delivery updates and inbound SMS, deploy the routes to a public HTTPS host and set NEXT_PUBLIC_APP_URL to that public host, OR use a secure public tunnel during local testing and set the URL to that tunnel. A public Vercel deployment is easiest for normal use.

TWILIO CONSOLE CONFIGURATION
On the SMS-capable Twilio number, configure the incoming-message webhook:
https://YOUR-PUBLIC-DOMAIN/api/twilio/sms
Method: HTTP POST

The sending action includes this delivery callback:
https://YOUR-PUBLIC-DOMAIN/api/twilio/sms/status

TEST
- Send one short test to a phone you control.
- A returned Twilio status of queued/sent means accepted or handed to a carrier; it does NOT prove delivery.
- Wait for callback status delivered or undelivered. If undelivered/failed, the ERP displays an error code where Twilio supplies one.
- If no callback occurs, check the public URL and Twilio Messaging Logs before retrying. Do not repeatedly send paid test messages.
- Incoming SMS requires a real SMS-capable Twilio number with the incoming webhook configured to the public URL.

WHAT I CANNOT CLAIM
I cannot send a real SMS from this environment or see your private Twilio console. These code changes need to be installed, deployed and tested against your account. They do not by themselves guarantee carrier delivery.
