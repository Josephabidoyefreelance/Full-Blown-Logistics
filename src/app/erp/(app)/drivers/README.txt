JAAD DRIVER ROUTE CONFLICT - FINAL CLEANUP

This fixes the exact Next.js error:
Conflicting route and page at /drivers

1. Put FIX-DRIVERS-ROUTE.bat in the ROOT of your JAAD ERP project (the same folder as package.json).
2. Double-click FIX-DRIVERS-ROUTE.bat.
3. Wait for it to say DONE.
4. Start the project again with: npm run dev

IMPORTANT:
Do not create src/app/(app)/drivers/route.ts. The Drivers page is page.tsx and must be the only /drivers route.
This fix does not change the Driver UI/design.
