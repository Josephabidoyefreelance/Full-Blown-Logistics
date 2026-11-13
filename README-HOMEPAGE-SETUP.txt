JAAD REDESIGNED PUBLIC HOMEPAGE

Included files:
- src/app/page.tsx                         Logistics homepage route: http://localhost:3000
- src/app/erp/page.tsx                     Public ERP product overview: http://localhost:3000/erp
- src/components/homepage/Homepage.tsx    Homepage layout and styles
- public/jaad-logo.png                    Original JAAD logo supplied in the conversation

INSTALL INTO YOUR EXISTING NEXT.JS PROJECT
1. Extract this ZIP.
2. In your existing project folder (jaad-backend), copy the included src and public folders into the matching folders.
3. Allow Windows to merge folders. Replace only src/app/page.tsx and create/replace src/components/homepage/Homepage.tsx. Copy public/jaad-logo.png into your existing public folder.
4. Do not replace package.json, .env.local, Supabase libraries, admin pages, customer authentication, or any database files.
5. Start the existing app from the project root:
   npm run dev
6. Open http://localhost:3000

IMPORTANT NOTES
- The public homepage separates JAAD's logistics services from the ERP/CRM software product. The ERP navigation points to /erp, which must already exist or be added separately.
- The supplied logistics hero image and all four supplied service images are included under public/. The Privacy Policy, Terms of Service and chatbot FAQ training PDF are included under public/documents/.
- The chatbot now uses a small keyword-based answer set based on the supplied FAQ PDF, supports a human-agent request state, and pauses automated replies after the user asks for an agent. The lead/message form is still not connected to the Supabase/admin inbox because the approved backend endpoint and table schema were not included with these uploads. Do not present messages as delivered to staff until that integration is completed. The FAQ answers are a basic local implementation, not a hosted AI model or real-time tracking connection.
- Existing routes referenced in links are assumed to be /customer/login, /customer/signup, and /admin/login. Update those hrefs if your existing route names differ.
- This bundle changes no environment variables, Supabase schema, RLS policies, or remote Git branches. Test locally before deploying.

Additional UI changes in this revision: removed the top tagline strip and decorative marks before section labels; added supplied service photos; made chatbot launcher black; added FAQ accordion; added PDF links; added email, WhatsApp, and telephone icons in footer. ERP & CRM links remain directed to /erp (the public product overview), not customer login.

Revision 3: hero visual now uses the supplied air-freight image without the overlaid marketing card; ERP & CRM has its own public overview route at /erp; footer social/contact links are separated; removed the chatbot backend warning text and tightened the chat panel. Instagram and Telegram links currently open their general platforms because the official JAAD account handles were not supplied. Replace those URLs with the exact official account URLs before publishing.


CONTACT / ERP FIXES IN THIS VERSION
- Removed Telegram from the homepage and ERP footer.
- Added the supplied WhatsApp, Instagram and email logo images to public/.
- Updated WhatsApp and Instagram links and formatted the call number as 234-(707)-568-8573.
- Made the ERP overview page use the same footer structure as the main homepage.
- Kept /erp as the public ERP overview; Customer login remains a separate route.
- This archive is a source-code patch; it has not been deployed to the live website.


FOOTER + PDF CORRECTION (this revision)
- Copyright and legal links are centered on both homepage and ERP overview footer.
- No divider line appears above the centered copyright/legal row.
- The supplied Privacy Policy and Terms of Service PDFs are in public/documents/ using the exact filenames referenced by the links.
- Links open the PDFs in a new browser tab at /documents/JAAD-LOGISTICS-Privacy-Policy.pdf and /documents/JAAD-LOGISTICS-Terms-of-Service.pdf.
