JAAD ERP LIVE CHAT — REPLACEMENT COMPONENT

The approved reference layout is: Open/Pending/Resolved side-by-side above a searchable customer list on the left; the selected conversation in a separate wide right panel; message history filling the available area; composer pinned at the bottom.

FILES
- live-chat-panel.tsx: replacement component only.
- page-livechat-query-change.txt: query requirement for the conversation start timestamp.

INSTALL
1. Back up your current LiveChatPanel component.
2. Replace the existing live-chat-panel.tsx with this file. Keep your existing ./actions and ./message-content modules.
3. Update the Support page live_chats query to select: id, customer_name, customer_email, customer_phone, status, created_at.
4. Restart Next.js and test the actual app.

FUNCTIONS IN THE COMPONENT
- Search conversations and select Open/Pending/Resolved chats.
- Send text messages using the existing sendLiveChatMessage server action.
- Upload files using the existing uploadLiveChatFile server action.
- Move a chat to Pending or Resolved, and reopen a resolved chat without deleting history.
- Download a text transcript for the selected conversation.
- Minimize to a smaller centered window, maximize, and restore.

IMPORTANT LIMITS
- This file has not been run in your local project. Confirm TypeScript/build and test each feature locally before production use.
- File upload depends on the existing Supabase Storage bucket `chat-attachments` and its permissions.
- Existing server actions and message-content.tsx must remain available at the imported paths.
- Knowledge Base and other support panels are not changed by this component.
