'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSupportSms } from './actions';

type Sms = { id: string; to_number: string; message: string; status: string; created_at: string };

export default function SmsPanel({ history }: { history: Sms[] }) {
  const [tab, setTab] = useState<'compose' | 'sent'>('compose');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['compose', 'sent'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? 'bg-red-600 text-white' : 'border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'compose' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Send SMS</h3>
          <p className="mb-4 text-xs text-neutral-400">Connect an SMS provider such as Twilio or Termii for live delivery.</p>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <form
            ref={formRef}
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await sendSupportSms(fd);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                formRef.current?.reset();
                setMessage('');
                setTab('sent');
                router.refresh();
              });
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-neutral-500">To</label>
              <input
                name="to_number"
                required
                placeholder="08061234567"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-neutral-500">Message</label>
              <textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={320}
                rows={5}
                placeholder="Type SMS"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-400 dark:border-neutral-700">
                {message.length} / 320
              </span>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'sent' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[160px_1fr_140px] items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <div>To</div>
              <div>Message</div>
              <div className="text-right">Date</div>
            </div>
            {history.map((s) => (
              <div key={s.id} className="grid grid-cols-[160px_1fr_140px] items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800">
                <div className="truncate text-neutral-700 dark:text-neutral-300">{s.to_number}</div>
                <div className="truncate text-neutral-900 dark:text-neutral-100">{s.message}</div>
                <div className="text-right text-xs text-neutral-400">{new Date(s.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            {!history.length && <div className="px-5 py-8 text-center text-neutral-400">No SMS sent yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
