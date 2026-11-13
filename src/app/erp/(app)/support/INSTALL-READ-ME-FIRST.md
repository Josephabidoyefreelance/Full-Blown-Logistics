# JAAD ERP Support Corrections — Email + Live Chat

This package combines the real database-backed Live Chat panel with the Gmail inbox/attachment patch. It is source code to merge into the existing Next.js project; it has not been installed into your local running app and has not been tested against your live Supabase/Google/Resend accounts.

## Included

- `app/support/live-chat-panel.tsx`: live chat UI based on your supplied reference, but reads real `live_chats` and `live_chat_messages` data instead of the sample chats in the pasted prototype.
- `app/support/message-content.tsx`: message rendering for live chat attachment links.
- `app/support/email-panel.tsx`: Gmail-style compose and inbox, multi-attachment support, full message view, refresh/sync controls, unread/read display, and notification/sound controls.
- Gmail OAuth and inbox sync API routes under `app/api/auth/gmail/`.
- Authenticated email attachment download route under `app/api/support/email-attachment/`.
- `app/support/actions.ts`: support actions including email attachment sending and live-chat file upload.
- `app/support/page.tsx`: reference Support page with the live-chat `created_at` query included.
- `lib/gmail-token.ts` and `supabase/20261010_gmail_sync.sql`.

## Install carefully

1. Back up the existing project or commit it to Git first.
2. Match the package paths to your app root. If your project uses `src/app`, place `app` contents under `src/app` and `lib` under the matching source root as appropriate.
3. Merge `app/support/page.tsx` into your current Support page rather than blindly replacing it if you have newer changes in tickets, SMS, calls, WhatsApp, team chat, or the knowledge base. Keep the live-chat query selecting `id, customer_name, customer_email, customer_phone, status, created_at`; keep the chat message query selecting `id, chat_id, sender, message, created_at`.
4. Keep the included `actions.ts` only if it matches your latest support actions. If your local file has newer functions, merge those functions rather than overwriting them.
5. Run `supabase/20261010_gmail_sync.sql` in the Supabase SQL Editor.
6. Merge the Server Actions upload limit into your existing `next.config.js`/`next.config.mjs` (do not replace unrelated config):

```js
experimental: {
  serverActions: { bodySizeLimit: '30mb' },
}
```

Use the config shape supported by your installed Next.js version, then restart the dev server.

## Gmail connection required

Add these to `.env.local` using your own newly rotated secrets:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=replace_with_64_hex_characters
```

Generate the encryption key locally with `openssl rand -hex 32`. Keep existing Supabase and Resend variables. Do not commit `.env.local`. If credentials/secrets were shared in chats or screenshots, rotate them before use.

In Google Cloud, enable Gmail API, configure OAuth consent, add the mailbox as a test user while in Testing, create a Web application OAuth client, and register this exact redirect URI: `http://localhost:3000/api/auth/gmail/callback`.

## Test in this order

1. Start Next.js and sign into JAAD ERP.
2. Open `/support?view=livechat`; verify existing conversations appear, select a chat, send a reply, upload a small file, resolve/reopen, and download a transcript.
3. Open `/support?view=email`; click **Sync Gmail** and authorize the exact Gmail mailbox that receives customer replies.
4. Click **Sync Gmail** again if necessary, then send a test message to that Gmail mailbox and sync again. The inbox sync is manual plus periodic while the Email panel is open.
5. Attach a small file in Compose and send it. Check both the CRM record and the recipient's mailbox.
6. If Resend shows **Bounced**, inspect the bounce reason. Gmail inbox sync does not fix outbound sender verification or bounced mail.

## Important limits

- Gmail sync imports Inbox messages; it does not sync Gmail Sent mail or labels.
- The Google OAuth flow, environment values, Supabase schema/storage permissions, and provider setup must be configured before end-to-end operation.
- Live chat file upload requires a Supabase Storage bucket named `chat-attachments` and correct upload/read policies. The current action stores a public URL, so use a private bucket and signed URLs if attachments should not be public.
- Browser notification/sound depends on browser permissions and the Email panel being open.
- Type/source review is not a substitute for a full project build and live integration test. No claim is made that this package is already running in your local app.
