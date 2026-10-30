JAAD REPORTS — SPACING + PRINT BUTTON FIX

This package contains two files because the Print Report button downloading CSV means the current API route does not correctly handle `?format=print`.

1) Replace the Reports page:
   src/app/(app)/reports/page.tsx
   with this package's src/app/(app)/reports/page.tsx

2) Replace the report API route:
   src/app/api/reports/[category]/route.ts
   with this package's src/app/api/reports/[category]/route.ts

If your app uses app/ rather than src/app/, place both files under the matching active app root. Your earlier screenshot showed the Reports page at src/app/(app)/reports/page.tsx.

3) Back up both current files first.
4) Stop the dev server (Ctrl+C), delete `.next`, and restart using `npm run dev`.

What this does:
- Uses a compact responsive layout and stretches the three-row card grid to use the visible page area instead of leaving a large blank area below the cards.
- Print Report requests `?format=print` and the API route explicitly returns `text/html`, not CSV.
- Prints from a hidden iframe rather than navigating to a new tab.
- Leaves CSV, Excel and PDF downloads as downloads.

Important:
- Existing schema mappings for customers, drivers and warehouse are assumptions. Verify these table/column names against your Supabase schema.
- This is a replacement route based on the mappings available from prior code, and has not been run against your local database.
