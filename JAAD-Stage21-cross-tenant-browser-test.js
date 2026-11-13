/* JAAD Stage 21 — browser-console test. Run on localhost:3000 after signing in.
   This script is TEST-ONLY. No company IDs or emails are embedded.
   It uploads one 1x1 PNG into the current user's authorized chat.
   It never uploads into another tenant's chat successfully by design.
*/
(async () => {
  const ownChatId = prompt('Enter a live-chat UUID belonging to YOUR logged-in company:')?.trim();
  const otherChatId = prompt('Enter a live-chat UUID belonging to a DIFFERENT company:')?.trim();
  const otherPath = prompt('Optional: paste the full Storage path of an attachment created by the OTHER company (leave blank on first run):')?.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(ownChatId || '') || !uuid.test(otherChatId || '') || ownChatId === otherChatId) {
    console.error('Invalid or duplicate chat IDs; no requests sent.'); return;
  }
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9j8eUAAAAASUVORK5CYII='), c => c.charCodeAt(0));
  const makeForm = chatId => { const form = new FormData(); form.append('chatId', chatId); form.append('file', new File([png], 'stage21-test.png', { type: 'image/png' })); return form; };
  const post = chatId => fetch('/api/chat-attachments', { method: 'POST', body: makeForm(chatId), credentials: 'same-origin', redirect: 'manual', cache: 'no-store' });
  const get = (path, credentials = 'same-origin') => fetch('/api/chat-attachments?path=' + encodeURIComponent(path), { credentials, redirect: 'manual', cache: 'no-store' });
  const rows = [];
  const own = await post(ownChatId);
  const ownBody = await own.json().catch(() => ({}));
  rows.push({ test: 'Authorized own-company upload', status: own.status, pass: own.ok && !!ownBody.path, note: ownBody.error || '' });
  const foreignUpload = await post(otherChatId);
  rows.push({ test: 'Foreign-company upload blocked', status: foreignUpload.status, pass: [401, 403, 404].includes(foreignUpload.status), note: '' });
  if (own.ok && ownBody.path) {
    const ownGet = await get(ownBody.path);
    rows.push({ test: 'Own attachment download authorized', status: ownGet.status, pass: [200, 302, 307, 308].includes(ownGet.status), note: '' });
    const anonGet = await get(ownBody.path, 'omit');
    rows.push({ test: 'Unauthenticated download blocked', status: anonGet.status, pass: [401, 403, 404].includes(anonGet.status), note: '' });
    console.log('COPY THIS PATH for testing from the OTHER company session:', ownBody.path);
  }
  if (otherPath) {
    const foreignGet = await get(otherPath);
    rows.push({ test: 'Foreign-company download blocked', status: foreignGet.status, pass: [401, 403, 404].includes(foreignGet.status), note: '' });
  }
  console.table(rows);
  console.log('PASS count:', rows.filter(r => r.pass).length, '/', rows.length);
  console.log('IMPORTANT: A 403 on own upload is a failure, not proof of isolation. Use an ordinary customer tenant with Support permission.');
  console.log('This test does not cover employee roles, legacy paths, or all remaining chat components.');
})().catch(e => console.error('Test execution failed:', e));
