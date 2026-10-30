JAAD ERP — PDF 404 FIX (ROUTE ONLY)

The screenshot shows Next.js returning 404 at:
  http://localhost:3000/api/clock-tracker/report

The report button already targets that URL. The Next.js API route must physically exist at:
  <YOUR PROJECT ROOT>/src/app/api/clock-tracker/report/route.ts

IMPORTANT:
- Do NOT place it in src/app/(app)/api/...
- Do NOT place it in src/app/clock-tracker/api/...
- Do NOT keep it inside the outer ZIP folder when copying.
- The project root is the folder containing package.json.
- Your existing page stack previously showed src/app/(app)/clock-tracker/page.tsx, so this patch uses src/app/ as the app root.
- This route expects your existing @/lib/supabase/server helper, profiles table (full_name), and clock_entries table with the columns referenced in route.ts.

INSTALL:
1. Extract this ZIP.
2. From the extracted folder, copy the `src/app/api/clock-tracker/report/route.ts` file into the exact same path inside your project (merge folders; do not create an extra `JAAD_PDF_ROUTE_FIX` folder inside src).
3. Confirm the final full path ends in `src/app/api/clock-tracker/report/route.ts`.
4. Stop the dev server with Ctrl+C.
5. Restart using `npm run dev`.
6. Open `http://localhost:3000/api/clock-tracker/report` while signed in. It should download a `.pdf` file. If the route returns 401, sign in first. If it returns 500, inspect the terminal for the reported database/query error.

This patch corrects duplicate declarations in the previous route source. It cannot be copied into your live localhost automatically from ChatGPT; it must be placed in your project and the server restarted.
