JAAD ERP CLOCK TRACKER — TARGETED FIX

This package contains ONLY two files:
1. src/app/(app)/clock-tracker/live-work-time.tsx
   Removes the unwanted line under the employee name (Elapsed / Regular today / Overtime / Timer paused).
2. src/app/api/clock-tracker/report/route.ts
   Provides the PDF download route for /api/clock-tracker/report.

INSTALL:
1. Stop the Next.js development server.
2. Extract this ZIP into the ROOT of the same project folder that contains package.json.
3. Allow the two files to overwrite the existing files at the exact paths shown above.
4. Start the server again with npm run dev.
5. Open http://localhost:3000/api/clock-tracker/report while signed in. It should download a PDF.
6. Then test the Download PDF report button from Clock Tracker.

IMPORTANT:
- Do not extract inside src/app or inside the clock-tracker folder. Extract at project root so the src/... paths merge correctly.
- This package changes no other ERP module.
- If the endpoint still shows 404 after copying to the exact path, check whether your running app uses a different project folder/port or whether a second Next.js server is running. The route must be at src/app/api/clock-tracker/report/route.ts, NOT inside src/app/(app)/.
