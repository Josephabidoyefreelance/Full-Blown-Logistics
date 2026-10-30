JAAD ERP — DUPLICATE HR SHELL REPAIR

1. Extract this ZIP into your JAAD ERP project root (the folder containing package.json).
2. Double-click FIX_HR_DUPLICATE_LAYOUT.bat.
3. If it finds src/app/(app)/hr/layout.tsx or src/app/hr/layout.tsx, it backs it up as .tsx.disabled and removes the active duplicate layout file.
4. Restart Next.js: Ctrl+C, then npm run dev.
5. Hard refresh the browser: Ctrl+Shift+R.

The script does not touch the main src/app/(app)/layout.tsx, the HR page, data, or other modules.
If it reports that no nested HR layout exists, it changes nothing. That result means the duplicate shell is coming from another component/route and the current page.tsx alone cannot establish which one.
