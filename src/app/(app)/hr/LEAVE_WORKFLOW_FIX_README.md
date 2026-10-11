# JAAD ERP — leave workflow update

## Workflow
- Four drag-and-drop columns: **Pending → Awaiting Approval → Approved / Declined**.
- Every new leave application is saved directly as **Awaiting Approval**. Pending is available as an extra holding stage; it is not the default for new requests.
- Moving a request saves its status in Supabase. Approved/Declined triggers a portal notice and attempts to email the employee.
- Declined leave does not put the employee on leave. Approved leave marks them `On Leave` only during the approved dates; the existing sync function restores `Active` after the end date when HR loads the page.

## Install
Merge the included files into the project root (the folder containing `package.json`), keeping the included folder structure.

## Email setup required
This package sends decision emails through Resend. Add these variables to `.env.local` and your deployed environment, using a sender/domain verified in Resend:

```env
RESEND_API_KEY=re_your_actual_key
LEAVE_NOTIFICATION_FROM=JAAD Logistics HR <hr@your-verified-domain.com>
```

Restart/redeploy the app after setting environment variables. Without these settings, status changes still save and the portal notice still works, but email delivery is not possible.

## Test
1. Submit a request from the employee portal; confirm it appears in **Awaiting Approval**.
2. Drag it through Pending and back to Awaiting Approval; confirm the stage and count update.
3. Drag to Approved; check the employee portal and employee email inbox.
4. Repeat with Declined. Check server logs/HR notice if the email provider rejects the message.

The employee portal notice is shown when the employee opens or refreshes the portal. This package does not implement browser push notifications while the employee is logged out.
