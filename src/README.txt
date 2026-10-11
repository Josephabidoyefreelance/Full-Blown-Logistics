JAAD targeted build-fix patch
Copy the included paths into the root of your project, merging folders:
1) src/lib/gmail-token.ts fixes the existing @/lib/gmail-token imports without changing the Gmail routes.
2) src/app/(app)/hr/employee-portal/leave-form.tsx supplies the component imported by employee-portal/page.tsx.
3) In src/app/(app)/hr/vote/[id]/page.tsx, change the import to:
   import { submitPublicVote as voteEmployeePublic } from './actions';
This preserves existing usage while matching the action export named by the build error.
Do not replace existing files wholesale. Back up any target file before changes.
Then run npm run build. This patch has not been tested against the full local project.
