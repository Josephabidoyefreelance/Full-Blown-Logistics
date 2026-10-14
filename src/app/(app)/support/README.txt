JAAD call button + Twilio console-error fix
==========================================

Replace only:
src/app/(app)/support/call-panel.tsx

The included actions.ts is unchanged from the previous package; you do not need to replace it unless you want the matching copy.

This patch:
- Changes the visible call action to a WhatsApp-style circular green handset button.
- Changes the active-call action to a circular red end-call handset button.
- Adds a synchronous dialing lock so rapid taps cannot start duplicate calls while Twilio connect is pending.
- Sets Twilio Voice SDK logging to silent to stop its gateway General Error console log from opening the Next.js red development overlay. App-level setup errors are still shown through the existing UI.
- Does not change dashboard cards, colours, card dimensions, keypad layout, or Recent Calls styling.

After replacing the file, restart the local Next.js dev server and test once. The UI patch cannot fix an underlying Twilio gateway/network failure, but it prevents the SDK's routine console log from being surfaced as a fatal-looking Next.js overlay.
