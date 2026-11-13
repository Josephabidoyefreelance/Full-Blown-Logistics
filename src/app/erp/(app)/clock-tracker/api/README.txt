JAAD ERP CLOCK TRACKER — PDF ROUTE REPAIR

ROOT CAUSES FOUND IN clock-tracker(3).zip
1. The report route was stored under clock-tracker/api/... in the supplied patch. That folder is not a Next.js route directory. The live page shown in the supplied screenshot is under src/app/(app)/clock-tracker, so the matching API handler must be at src/app/api/clock-tracker/report/route.ts.
2. The PDF loop used `line.split('\t')`, but each `line` is already an array of cell strings (`string[]`). This throws at runtime and makes the endpoint return HTTP 500.
3. The PDF declares landscape A4 [0 0 842 595] but placed title and headers at y=800/782/756, outside the page. The positions are corrected.
4. It attempted 48 rows per page, too many for the layout. It now paginates at 34 rows.

INSTALL
Copy/merge the included `src/` folder into the project root, replacing:
src/app/api/clock-tracker/report/route.ts

Do not put the route under `src/app/(app)/...`. Route groups are for UI pages; the URL /api/clock-tracker/report maps to src/app/api/clock-tracker/report/route.ts.

After copying:
1. Stop the Next.js dev server with Ctrl+C.
2. Restart with `npm run dev` from the correct project root.
3. While signed in, click Download PDF report.
4. The route should return `Content-Type: application/pdf`, not a Next.js 404 page.

TEST REPORT
The exact corrected route handler was executed in an isolated Node harness with mocked Supabase authentication and 40 representative clock records. The harness verified:
- Authenticated response status 200.
- Content-Type application/pdf.
- Content-Disposition attachment filename.
- Response begins with %PDF-.
- The generated file opens with pdfinfo, and text extraction confirms report title, headers and record data.
- Unauthenticated response status 401.
This test validates the handler and PDF generation, but not the user's live Supabase credentials/database or whether the local project has loaded this file.
