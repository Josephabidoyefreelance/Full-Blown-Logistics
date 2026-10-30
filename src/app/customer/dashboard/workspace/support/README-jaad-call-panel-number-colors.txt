JAAD Logistics call panel update

Replace only:
src/app/(app)/support/call-panel.tsx

with jaad-call-panel-number-colors.tsx (rename it to call-panel.tsx).

This removes the hover background/lift effects. Only the metric numbers are colored:
- Outbound Calls: yellow
- Answered: green
- Declined / Busy: orange
- Unanswered: purple
- Failed: red
- Total Calls: orange

The call insight section is not included. Existing call history and dialler are retained from the supplied base component.
No Twilio configuration is changed.
