'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSupportWhatsapp } from './actions';

type Wa = { id: string; to_number: string; message: string; direction: string; created_at: string };

export default function WhatsappPanel({ history }: { history: Wa[] }) {
  const [tab, setTab] = useState<'whatsapp' | 'log'>('whatsapp');
  const [toNumber, setToNumber] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const thread = history.filter((h) => h.to_number === toNumber);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['whatsapp', 'log'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? 'bg-red-600 text-white' : 'border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            {t === 'whatsapp' ? 'WhatsApp' : 'Chat log'}
          </button>
        ))}
      </div>

      {tab === 'whatsapp' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">WhatsApp</h3>
          <p className="mb-4 text-xs text-neutral-400">
            Messages stay inside the ERP. Connect WhatsApp Business Cloud API/webhooks for real inbound and outbound traffic.
          </p>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium uppercase text-neutral-500">To</label>
            <input
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="2348061472153"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            {thread.length === 0 && (
              <div className="py-6 text-center text-sm text-neutral-400">No messages in this chat yet.</div>
            )}
            {thread.map((m) => (
              <div key={m.id} className="mb-2 ml-auto max-w-[70%] rounded-lg bg-green-600 px-3 py-2 text-sm text-white">
                {m.message}
              </div>
            ))}
          </div>

          <form
            ref={formRef}
            action={(fd) => {
              if (!toNumber.trim()) {
                setError('Enter a recipient number first.');
                return;
              }
              fd.set('to_number', toNumber);
              setError(null);
              startTransition(async () => {
                const res = await sendSupportWhatsapp(fd);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                formRef.current?.reset();
                router.refresh();
              });
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-neutral-500">Message</label>
              <textarea
                name="message"
                rows={3}
                placeholder="Type WhatsApp message"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-400 dark:border-neutral-700"
                title="File attachments require a WhatsApp Business API connection"
              >
                Attach file
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Sending...' : 'Send WhatsApp'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'log' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[180px_1fr_140px] items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <div>To</div>
              <div>Message</div>
              <div className="text-right">Date</div>
            </div>
            {history.map((m) => (
              <div key={m.id} className="grid grid-cols-[180px_1fr_140px] items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800">
                <div className="truncate text-neutral-700 dark:text-neutral-300">{m.to_number}</div>
                <div className="truncate text-neutral-900 dark:text-neutral-100">{m.message}</div>
                <div className="text-right text-xs text-neutral-400">{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            {!history.length && <div className="px-5 py-8 text-center text-neutral-400">No WhatsApp messages yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
