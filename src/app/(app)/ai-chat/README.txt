# JAAD ERP AI Assistant — Next.js App Router package

## Files
- `app/ai-chat/page.tsx`: the AI Assistant page at `/ai-chat`
- `app/api/ai-assistant/chat/route.ts`: server-side AI API endpoint
- `.env.example`: environment variable template

## Install
1. Copy the `app/ai-chat/page.tsx` file into the same route location inside your existing Next.js project. If your project uses `src/app`, put it at `src/app/ai-chat/page.tsx` instead.
2. Copy `app/api/ai-assistant/chat/route.ts` into your existing project's matching API route. If your project uses `src/app`, put it at `src/app/api/ai-assistant/chat/route.ts`.
3. In the project root, create or edit `.env.local`. Add at least one real provider key:
   - `OPENAI_API_KEY=...` for OpenAI
   - `ANTHROPIC_API_KEY=...` for Claude
   - `GEMINI_API_KEY=...` for Gemini
   You only need the provider(s) you intend to use. Do not paste API keys into chat messages or client-side files.
4. Restart the Next.js dev server after editing `.env.local`.
5. Open `http://localhost:3000/ai-chat`.

## Notes
- This package uses server-side `fetch`; it does not require provider SDK packages.
- Provider API keys are secrets and must remain in `.env.local` on the server.
- The page includes provider sign-in buttons as UI placeholders, but this package uses API keys for model requests. OAuth sign-in endpoints are not included.
- This basic version does not yet save chat history to Supabase or check your ERP's authenticated-user permissions. Add those before production/multi-user deployment.
- The API route should be integrated with your existing authentication/rate limiting before exposing it to employees.
