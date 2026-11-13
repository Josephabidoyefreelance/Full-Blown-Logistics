JAAD Logistics Call Panel — Number Colours Only

Replace only:
src/app/(app)/support/call-panel.tsx

with jaad-call-panel-number-colors-only.tsx (rename it to call-panel.tsx).

The six cards remain white with no card hover colour effect. Only the metric numbers are coloured:
- Outbound Calls: yellow
- Answered: green
- Declined / Busy: orange
- Unanswered: purple
- Failed: red
- Total Calls: orange

The Call Activity Insights section is not included in this component.
This file does not change Twilio configuration.
