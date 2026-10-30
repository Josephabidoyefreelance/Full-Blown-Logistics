JAAD ERP Support patch

1. Replace the existing live-chat-panel.tsx with the included live-chat-panel.tsx.
2. Do not replace or edit the Knowledge Base component.
3. Keep the existing actions.ts and message-content.tsx files; this patch imports and uses them.
4. The Live Chat panel now uses a responsive two-column layout on desktop:
   - Left: separate Open, Pending, Resolved tabs, chat search, and matching chat list.
   - Right: selected conversation, message history, status actions, and reply composer pinned to the bottom.
   - On narrow screens, the layout stacks so it remains usable on phones.
5. Restart the Next.js dev server if the change does not appear, then hard-refresh the page.

Note: This updates the source component only; it does not directly modify the running localhost application.
