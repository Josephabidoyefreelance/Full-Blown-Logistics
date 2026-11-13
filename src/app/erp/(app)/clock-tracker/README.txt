JAAD ERP CLOCK TRACKER — SOURCE FOLDER (NOT A ZIP)

Files in this folder:
- page.tsx: Clock Tracker page and report calculations
- actions.ts: authenticated clock-in, pause/resume, clock-out actions
- clock-button.tsx: Pause/Resume and inactivity event handling
- live-work-time.tsx: live elapsed, weekly, and overtime display
- report-route.ts: PDF report route source (copy to the matching route.ts path)

Important calculation correction:
- Duration is the full net working time for the session, excluding paused time.
- Weekly Time is the cumulative net working time for the Monday–Sunday week.
- Overtime is the portion above the daily 8-hour or weekly 40-hour regular allowance.
- Idle Time comes from stored idle_seconds; pause/resume actions must persist pause intervals correctly.

Install the files into the existing app directory; do not replace the entire ERP. The expected destinations are usually:
- page.tsx, actions.ts, clock-button.tsx, live-work-time.tsx -> src/app/(app)/clock-tracker/
- report-route.ts -> src/app/api/clock-tracker/report/route.ts

If your project uses a root app/ directory instead of src/app/, use the equivalent paths there.

Verification limitation: this folder was prepared from the supplied Clock Tracker source fragment. The full application build, live Supabase operations, browser event behaviour, and generated PDF have not been verified against the running ERP. Review the PDF route calculations before deployment so the PDF reports the same Duration and Weekly Time definitions as the page.

REPORT CONSISTENCY NOTE
The included report-route.ts has been updated to use landscape PDF dimensions and include Duration, Weekly Time, Overtime, and Idle Time. The route still needs to be copied to the correct path in your active project and tested with your real authenticated session.


HYDRATION ERROR FIX (live-work-time.tsx)
- The timer state now starts at 0 on both server and client, then initializes in useEffect after hydration.
- This prevents server-rendered and client-rendered timer text from differing by a second or two.
- The unwanted “Elapsed” label was removed from the live status line.
- This is a source-level fix. A complete Next.js build and browser verification require the full running project.
