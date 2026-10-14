# JAAD announcement expiry control — visible UI fix

This focused patch fixes the missing expiry control in the **Post an announcement** dialog. It explicitly renders an amber-highlighted **Schedule automatic expiry** panel with an **Auto-expire** checkbox and a duration dropdown (1, 2, 3, 4, 5, 6, 8, 12, 24, 48, or 72 hours). The default is enabled at 5 hours. The timer begins when the announcement goes live, including for future scheduled announcements. Turning Auto-expire off keeps the announcement on the dashboard until a Super Admin deletes it.

## Important: copy the right file

Your admin route imports `PostAnnouncementButton` from `./post-announcement-button`. Replace this exact file in your current project:

`src/app/(app)/admin/post-announcement-button.tsx`

Also update `src/app/(app)/admin/actions.ts` so the server accepts the exact same expiry choices. The provided action file includes existing user, role, announcement, delete, and clock-tracker actions from the prior JAAD admin patch. **Back up your live file and compare exports before replacing it**. If your live file has extra functions, keep them and merge the updated `postAnnouncement` function plus the expanded allowed-duration set (1,2,3,4,5,6,8,12,24,48,72).

The `src/app/(app)/dashboard/announcements-panel.tsx` is included for reference/compatibility with the previous expiry patch. It queries only currently published, unexpired announcements and refreshes the feed every 30 seconds. This package deliberately does **not** include or modify `src/app/(app)/dashboard/page.tsx`.

## Database prerequisite

If you already ran the prior migration adding `announcements.publish_at` and `announcements.expires_at`, you do not need to run it again. Otherwise review and run `database/announcement-scheduling-expiry.sql` in Supabase SQL Editor. Publishing and deleting actions require the existing `@/lib/admin-security` implementation and an active Super Admin context.

## Apply and verify

1. Back up both live files.
2. Merge the ZIP at your project root, preserving the literal `(app)` path.
3. Ensure the form component at the exact path above is replaced (do not only replace `admin/page.tsx`).
4. Restart `npm run dev` and refresh `/admin?view=announcements` with a hard refresh.
5. Click **Post announcement**. The highlighted **Schedule automatic expiry** section should now appear under the message field.
6. Leave Auto-expire on, choose 5 or 6 hours, and publish. The expiry is stored as a timestamp calculated by the server from publication time. For scheduled notices the timer starts at the scheduled live time.
7. Keep the Dashboard open; its announcement panel re-queries every 30 seconds and excludes expired notices. Test a 1-hour test case if you want to verify sooner than a multi-hour wait.

## Verification performed here

TSX syntax-transpilation and ZIP integrity are checked during package generation. The full ERP build, Supabase migration, and live browser interaction could not be tested here because this environment is not connected to your running project/database.
