JAAD Google Calendar fixes
==========================

Replace these two files in your existing JAAD project:
1. src/app/(app)/calendar/page.tsx
2. src/app/api/calendar/events/route.ts

Changes:
- Removes the Agenda panel completely.
- Removes Agenda from the view selector; Month, Week and Day remain.
- Improves dark-theme detection so the calendar can follow the host ERP theme.
- Keeps JAAD red branding.
- Makes the invitee email payload compatible with the API.
- The API uses Google Calendar sendUpdates='all' when valid invitee emails are supplied, so Google Calendar sends invitations/updates to those invitees.

Supabase SQL:
The existing token-table SQL is included at supabase/PASTE_IN_SUPABASE_SQL_EDITOR.sql for reference. If you already ran this SQL successfully, do not run it again unless the table/policies are missing.

Before replacing files, keep a backup. The code has not been tested inside your local running project; test dark mode and create a meeting with your own email address first.
