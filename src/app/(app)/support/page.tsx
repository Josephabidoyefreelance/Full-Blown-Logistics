import { createClient } from '@/lib/supabase/server';
import { PrioritySwitch, TicketStatusSwitch } from './switches';
import LiveChatPanel from './live-chat-panel';
import EmailPanel from './email-panel';
import SmsPanel from './sms-panel';
import CallPanel from './call-panel';
import WhatsappPanel from './whatsapp-panel';
import NewTicketForm from './new-ticket-form';
import TeamChatPanel from './team-chat-panel';
import NewKbForm from './new-kb-form';
import EditKbForm from './edit-kb-form';

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'tickets' } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let currentUserName = 'You';
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    currentUserName = profile?.full_name || user.email || 'You';
  }

  const tickets = view === 'tickets'
    ? await supabase.from('tickets').select('id, ticket_no, customer_name, subject, priority, status, channel, opened_at, closed_at').order('opened_at', { ascending: false })
    : null;
  const kb = view === 'kb'
    ? await supabase.from('kb_articles').select('id, question, answer').order('created_at', { ascending: false })
    : null;

  const chats = view === 'livechat'
    ? await supabase.from('live_chats').select('id, customer_name, status').order('created_at', { ascending: false })
    : null;
  const chatMessages = view === 'livechat'
    ? await supabase.from('live_chat_messages').select('id, chat_id, sender, message, created_at').order('created_at', { ascending: true })
    : null;

  const emails = view === 'email'
    ? await supabase.from('support_emails').select('id, to_address, subject, body, status, direction, read, created_at').order('created_at', { ascending: false })
    : null;

  const sms = view === 'sms'
    ? await supabase.from('support_sms').select('id, to_number, message, status, created_at').order('created_at', { ascending: false })
    : null;

  const calls = view === 'call'
    ? await supabase.from('support_calls').select('id, number, status, created_at').order('created_at', { ascending: false })
    : null;

  const whatsapp = view === 'whatsapp'
    ? await supabase.from('support_whatsapp').select('id, to_number, message, direction, created_at').order('created_at', { ascending: true })
    : null;

  const teamChat = view === 'teamchat'
    ? await supabase.from('team_chat_messages').select('id, sender_name, message, created_at').order('created_at', { ascending: true })
    : null;
  const staffList = view === 'teamchat'
    ? await supabase.from('employees').select('name').not('name', 'is', null)
    : null;

  const open = (tickets?.data ?? []).filter((t) => t.status === 'Open');
  const resolved = (tickets?.data ?? []).filter((t) => t.status === 'Resolved');
  const today = new Date().toDateString();
  const openedToday = (tickets?.data ?? []).filter(
    (t) => t.opened_at && new Date(t.opened_at).toDateString() === today
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-5 shrink-0">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Support</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Tickets, live chat and knowledge base.</p>
      </div>

      {['tickets', 'livechat', 'teamchat', 'kb'].includes(view) && (
        <div className="mb-4 flex shrink-0 gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
          <a href="/support?view=tickets" className={`pb-2 ${view === 'tickets' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Tickets</a>
          <a href="/support?view=livechat" className={`pb-2 ${view === 'livechat' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Live chat</a>
          <a href="/support?view=teamchat" className={`pb-2 ${view === 'teamchat' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Team chat</a>
          <a href="/support?view=kb" className={`pb-2 ${view === 'kb' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Knowledge base</a>
        </div>
      )}

      <div className="min-h-0 flex-1">
      {view === 'tickets' && (
        <>
          <div className="mb-4 flex justify-end">
            <NewTicketForm />
          </div>

          <div className="mb-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Open tickets</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{open.length}</div>
              <div className="mt-1 text-[11px] text-neutral-400">awaiting a reply</div>
            </div>
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Resolved tickets</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{resolved.length}</div>
              <div className="mt-1 text-[11px] text-neutral-400">closed out</div>
            </div>
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Opened today</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{openedToday.length}</div>
              <div className="mt-1 text-[11px] text-neutral-400">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Open</h3>
          <OpenTicketTable rows={open} />

          <h3 className="mb-2 mt-5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Resolved <span className="font-normal text-neutral-400">&mdash; moves here automatically once marked Resolved</span>
          </h3>
          <ResolvedTicketTable rows={resolved} />
        </>
      )}

      {view === 'livechat' && (
        <LiveChatPanel chats={chats?.data ?? []} messages={chatMessages?.data ?? []} />
      )}

      {view === 'email' && <EmailPanel emails={emails?.data ?? []} />}

      {view === 'sms' && <SmsPanel history={sms?.data ?? []} />}

      {view === 'call' && <CallPanel history={calls?.data ?? []} />}

      {view === 'whatsapp' && <WhatsappPanel history={whatsapp?.data ?? []} />}

      {view === 'teamchat' && (
        <TeamChatPanel
          messages={teamChat?.data ?? []}
          currentUserName={currentUserName}
          staffNames={(staffList?.data ?? []).map((p) => p.name).filter(Boolean)}
        />
      )}

      {view === 'kb' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <NewKbForm />
          </div>
          {(kb?.data ?? []).map((k) => (
            <div key={k.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{k.question}</div>
                <EditKbForm id={k.id} question={k.question} answer={k.answer} />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{k.answer}</p>
            </div>
          ))}
          {!kb?.data?.length && (
            <div className="rounded-xl border border-neutral-200 bg-white px-5 py-8 text-center text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
              No knowledge base articles yet.
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

const CHANNEL_COLORS: Record<string, string> = {
  Email: '#2563c7',
  Call: '#ca8a04',
  'Live Chat': '#1f9d5c',
  SMS: '#7c3aed',
  WhatsApp: '#16a34a',
};

function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return <span className="text-neutral-400">&mdash;</span>;
  const color = CHANNEL_COLORS[channel] ?? '#888';
  return (
    <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {channel}
    </span>
  );
}

function OpenTicketTable({
  rows,
}: {
  rows: { id: string; ticket_no: string; customer_name: string | null; subject: string; priority: string; status: string; channel: string | null }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
          <th className="px-4 py-2.5">Ticket</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Subject</th>
          <th className="px-4 py-2.5">Channel</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Status</th>
        </tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="px-4 py-2.5 font-mono text-neutral-900 dark:text-neutral-100">{t.ticket_no}</td>
              <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{t.customer_name}</td>
              <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{t.subject}</td>
              <td className="px-4 py-2.5"><ChannelBadge channel={t.channel} /></td>
              <td className="px-4 py-2.5"><PrioritySwitch id={t.id} value={t.priority} /></td>
              <td className="px-4 py-2.5"><TicketStatusSwitch id={t.id} value={t.status} /></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">None</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ResolvedTicketTable({
  rows,
}: {
  rows: { id: string; ticket_no: string; customer_name: string | null; subject: string; status: string; channel: string | null; closed_at?: string | null }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
          <th className="px-4 py-2.5">Ticket</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Subject</th>
          <th className="px-4 py-2.5">Channel</th><th className="px-4 py-2.5">Closed</th><th className="px-4 py-2.5">Status</th>
        </tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="px-4 py-2.5 font-mono text-neutral-900 dark:text-neutral-100">{t.ticket_no}</td>
              <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{t.customer_name}</td>
              <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{t.subject}</td>
              <td className="px-4 py-2.5"><ChannelBadge channel={t.channel} /></td>
              <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">
                {t.closed_at ? new Date(t.closed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}
              </td>
              <td className="px-4 py-2.5"><TicketStatusSwitch id={t.id} value={t.status} /></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">None</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
