'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logSupportCall, updateSupportCallStatus } from './actions';
import type { Device as TwilioDeviceType, Call as TwilioCallType } from '@twilio/voice-sdk';

type Call = { id: string; number: string; status: string; created_at: string };

async function readApiJson(response: Response) {
  const body = await response.text();
  let payload: any;
  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    const hint = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
    throw new Error(
      response.status === 404
        ? 'Twilio token API route was not found (404). Make sure app/api/twilio/token/route.ts is installed, then restart the Next.js server.'
        : `Twilio token API returned HTML instead of JSON (HTTP ${response.status}). ${hint || 'Check the Next.js terminal for the server error.'}`
    );
  }
  if (!response.ok) throw new Error(payload?.error || `Request failed (HTTP ${response.status}).`);
  return payload;
}

const keypadRows = [
  [{ digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' }],
  [{ digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' }],
  [{ digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' }],
  [{ digit: '*', letters: '' }, { digit: '0', letters: '+' }, { digit: '#', letters: '' }],
];

export default function CallPanel({ history }: { history: Call[] }) {
  const [number, setNumber] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const intentionalHangupRef = useRef(false);
  const dialingRef = useRef(false);
  const router = useRouter();
  const [device, setDevice] = useState<TwilioDeviceType | null>(null);
  const [activeCall, setActiveCall] = useState<TwilioCallType | null>(null);
  const [incomingCall, setIncomingCall] = useState<TwilioCallType | null>(null);
  const incomingRecordIdRef = useRef<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [callState, setCallState] = useState('Connecting phone…');

  useEffect(() => {
    let mounted = true;
    let createdDevice: TwilioDeviceType | null = null;

    async function setupDevice() {
      try {
        const response = await fetch('/api/twilio/token', { cache: 'no-store' });
        const payload = await readApiJson(response);

        const { Device } = await import('@twilio/voice-sdk');
        createdDevice = new Device(payload.token, { logLevel: 5 });
        createdDevice.on('registered', () => {
          if (mounted) {
            setVoiceReady(true);
            setCallState('Ready to call');
          }
        });
        createdDevice.on('incoming', async (incoming) => {
          if (!mounted) {
            incoming.reject();
            return;
          }
          setIncomingCall(incoming);
          setActiveCall(incoming);
          setCallState('Incoming call');
          setError(null);
          setNotice(null);

          const from = String(incoming.parameters?.From ?? incoming.customParameters?.get?.('From') ?? '').trim();
          const formData = new FormData();
          formData.set('number', from || 'Unknown caller');
          const logged = await logSupportCall(formData, 'Inbound Ringing');
          if (logged?.error) {
            setNotice(`Incoming call, but history could not be saved: ${logged.error}`);
          } else if (logged?.id) {
            incomingRecordIdRef.current = logged.id;
            router.refresh();
          }

          incoming.on('accept', async () => {
            setIncomingCall(null);
            setCallState('Connected to caller');
            const id = incomingRecordIdRef.current;
            if (id) await updateSupportCallStatus(id, 'Inbound Answered');
            router.refresh();
          });
          incoming.on('disconnect', async () => {
            setIncomingCall(null);
            setActiveCall(null);
            setCallState('Ready to call');
            const id = incomingRecordIdRef.current;
            if (id) await updateSupportCallStatus(id, 'Inbound Answered');
            incomingRecordIdRef.current = null;
            router.refresh();
          });
          incoming.on('cancel', async () => {
            setIncomingCall(null);
            setActiveCall(null);
            setCallState('Ready to call');
            const id = incomingRecordIdRef.current;
            if (id) await updateSupportCallStatus(id, 'Inbound Missed');
            incomingRecordIdRef.current = null;
            router.refresh();
          });
          incoming.on('reject', async () => {
            setIncomingCall(null);
            setActiveCall(null);
            setCallState('Ready to call');
            const id = incomingRecordIdRef.current;
            if (id) await updateSupportCallStatus(id, 'Inbound Declined');
            incomingRecordIdRef.current = null;
            router.refresh();
          });
          incoming.on('error', async () => {
            setIncomingCall(null);
            setActiveCall(null);
            setCallState('Ready to call');
            const id = incomingRecordIdRef.current;
            if (id) await updateSupportCallStatus(id, 'Inbound Failed');
            incomingRecordIdRef.current = null;
            router.refresh();
          });
        });
        createdDevice.on('error', (err) => {
          if (!mounted) return;
          const message = String(err?.message ?? '');
          const code = String((err as any)?.code ?? (err as any)?.causes?.[0]?.code ?? '');
          const normalCallLifecycle =
            code === '31005' ||
            code === '31000' ||
            /31000|31005/.test(String(err)) ||
            /gateway.*HANGUP|HANGUP.*gateway/i.test(message) ||
            /UnknownError.*General Error|General Error/i.test(message);
          if (normalCallLifecycle) {
            setError(null);
            if (!activeCall) setCallState('Ready to call');
            return;
          }
          setVoiceReady(false);
          setCallState('Phone connection error');
          setError(message || 'Twilio phone connection failed.');
        });
        createdDevice.on('tokenWillExpire', async () => {
          try {
            const refreshed = await fetch('/api/twilio/token', { cache: 'no-store' });
            const next = await readApiJson(refreshed);
            if (next.token && createdDevice) createdDevice.updateToken(next.token);
          } catch {
            if (mounted) setError('Could not refresh the phone session. Reload this page.');
          }
        });
        await createdDevice.register();
        if (mounted) setDevice(createdDevice);
      } catch (err) {
        if (mounted) {
          setVoiceReady(false);
          setCallState('Phone not connected');
          setError(err instanceof Error ? err.message : 'Could not connect the phone.');
        }
      }
    }

    void setupDevice();
    return () => {
      mounted = false;
      if (createdDevice) void createdDevice.destroy();
    };
  }, []);

  const recentCalls = history;

  // Metrics are derived from the statuses saved in call history.
  // Twilio's status callback must update these records for the outcome counts to be authoritative.
  const normalizedStatus = (status: string) => status.toLowerCase().trim();
  const answeredCalls = history.filter((call) => {
    const status = normalizedStatus(call.status);
    return status === 'answered' || status === 'completed' || status.includes('answered') || status.includes('completed');
  }).length;
  const declinedCalls = history.filter((call) => {
    const status = normalizedStatus(call.status);
    return status.includes('declined') || status.includes('busy') || status.includes('rejected');
  }).length;
  const unansweredCalls = history.filter((call) => {
    const status = normalizedStatus(call.status);
    return status.includes('no-answer') || status.includes('no answer') || status.includes('unanswered') || status.includes('timeout');
  }).length;
  const inboundCalls = history.filter((call) => normalizedStatus(call.status).includes('inbound')).length;
  const failedCalls = history.filter((call) => {
    const status = normalizedStatus(call.status);
    return status.includes('failed') || status.includes('error');
  }).length;

  function addDigit(digit: string) {
    setNumber((current) => `${current}${digit}`.slice(0, 30));
    setError(null);
    setNotice(null);
  }

  function submitCall(fd: FormData) {
    const destination = String(fd.get('number') ?? '').trim().replace(/[\s().-]/g, '');
    if (!destination) {
      setError('Enter a phone number before placing a call.');
      return;
    }
    if (!/^\+?[1-9]\d{7,14}$/.test(destination)) {
      setError('Enter a valid phone number in international format, for example +2348012345678.');
      return;
    }
    if (!device || !voiceReady) {
      setError('The JAAD phone is not connected yet. Check Twilio configuration and reload this page.');
      return;
    }
    if (dialingRef.current || activeCall) return;
    dialingRef.current = true;

    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        intentionalHangupRef.current = false;
        setCallState(`Calling ${destination}…`);
        const call = await device.connect({ params: { To: destination } });
        setActiveCall(call);
        dialingRef.current = false;

        // Save the local Voice SDK lifecycle to the same history row. This works
        // on localhost too; it does not rely on Twilio reaching a localhost webhook.
        let supportCallId: string | null = null;
        let pendingStatus: string | null = null;
        let wasAccepted = false;
        let statusWriteInProgress = false;
        let terminalStatus: string | null = null;

        const persistStatus = async (status: string) => {
          if (!supportCallId) {
            pendingStatus = status;
            return;
          }
          if (statusWriteInProgress) {
            pendingStatus = status;
            return;
          }
          statusWriteInProgress = true;
          try {
            const update = await updateSupportCallStatus(supportCallId, status);
            if (update?.error) setNotice(`Call status could not be saved: ${update.error}`);
            else router.refresh();
          } finally {
            statusWriteInProgress = false;
            if (pendingStatus && supportCallId) {
              const nextStatus = pendingStatus;
              pendingStatus = null;
              void persistStatus(nextStatus);
            }
          }
        };

        call.on('ringing', () => {
          setCallState(`Ringing ${destination}…`);
          void persistStatus('Ringing');
        });
        call.on('accept', () => {
          wasAccepted = true;
          setCallState(`Connected to ${destination}`);
          void persistStatus('Answered');
        });
        call.on('reject', () => {
          dialingRef.current = false;
          terminalStatus = 'Declined / Busy';
          setActiveCall(null);
          setCallState('Ready to call');
          setNotice(null);
          void persistStatus(terminalStatus);
          router.refresh();
        });
        call.on('cancel', () => {
          dialingRef.current = false;
          const wasUserHangup = intentionalHangupRef.current;
          intentionalHangupRef.current = false;
          setActiveCall(null);
          setCallState('Ready to call');
          if (!wasAccepted) {
            terminalStatus = wasUserHangup ? 'Declined / Busy' : (terminalStatus || 'Unanswered');
            void persistStatus(terminalStatus);
          }
          router.refresh();
        });
        call.on('disconnect', () => {
          dialingRef.current = false;
          const wasUserHangup = intentionalHangupRef.current;
          intentionalHangupRef.current = false;
          setActiveCall(null);
          setCallState('Ready to call');
          setNotice(null);
          const finalStatus = wasAccepted ? 'Answered' : (terminalStatus || (wasUserHangup ? 'Declined / Busy' : 'Unanswered'));
          void persistStatus(finalStatus);
          router.refresh();
        });
        call.on('error', (err) => {
          dialingRef.current = false;
          const message = String(err?.message ?? '');
          const code = String((err as any)?.code ?? '');
          const isExpectedCallEnd =
            code === '31005' ||
            code === '31000' ||
            /31000|31005/.test(String(err)) ||
            /gateway.*HANGUP|HANGUP.*gateway/i.test(message) ||
            /UnknownError.*General Error|General Error/i.test(message);
          const wasUserHangup = intentionalHangupRef.current;
          setActiveCall(null);
          setCallState('Ready to call');
          if (isExpectedCallEnd) {
            setError(null);
            setNotice(null);
            terminalStatus = wasAccepted ? 'Answered' : (wasUserHangup ? 'Declined / Busy' : 'Failed');
            void persistStatus(terminalStatus);
          } else {
            setError(message || 'The call could not be connected.');
            terminalStatus = 'Failed';
            void persistStatus('Failed');
          }
          intentionalHangupRef.current = false;
          router.refresh();
        });

        const logData = new FormData();
        logData.set('number', destination);
        const result = await logSupportCall(logData, 'Initiated via Twilio');
        if (result?.error) {
          setNotice(`Call started, but call history could not be saved: ${result.error}`);
        } else if (result?.id) {
          supportCallId = result.id;
          if (pendingStatus) {
            const nextStatus = pendingStatus;
            pendingStatus = null;
            void persistStatus(nextStatus);
          }
          setNotice(null);
          router.refresh();
        } else {
          setNotice('Call started, but the history row ID was not returned.');
        }
      } catch (err) {
        dialingRef.current = false;
        setActiveCall(null);
        setCallState('Ready to call');
        const message = String((err as any)?.message ?? err ?? '');
        const code = String((err as any)?.code ?? '');
        if (code === '31000' || code === '31005' || /UnknownError.*General Error|Received an error from the gateway/i.test(message)) {
          setError(null);
          setNotice(null);
        } else {
          setError(message || 'Unable to start the call.');
        }
      }
    });
  }

  return (
    <section className="space-y-4">
       <div className="flex flex-wrap items-center justify-between gap-3">
         <div>
           <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Call centre</h2>
           <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Call history and dial pad in one view.</p>
         </div>
         <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{history.length} recorded calls</span>
       </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{notice}</p>}

      {/* Call metrics dashboard; the existing keypad and call-history layout remain unchanged. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: 'Inbound Calls', value: inboundCalls, detail: 'Incoming calls received' },
          { label: 'Outbound Calls', value: history.length, detail: 'Total recorded attempts' },
          { label: 'Answered', value: answeredCalls, detail: 'Answered or completed' },
          { label: 'Declined / Busy', value: declinedCalls, detail: 'Declined, rejected or busy' },
          { label: 'Unanswered', value: unansweredCalls, detail: 'No answer or timeout' },
          { label: 'Total Calls', value: history.length, detail: 'All calls recorded' },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{metric.label}</p>
            <p
              className="mt-2 text-2xl font-bold tracking-tight"
              style={{ color: ({
                'Outbound Calls': '#2563eb',
                Answered: '#16a34a',
                'Declined / Busy': '#dc2626',
                Unanswered: '#7c3aed',
                'Inbound Calls': '#d97706',
                'Total Calls': '#2563eb',
              } as Record<string, string>)[metric.label] }}
            >
              {metric.value}
            </p>
            <p className="mt-1 text-[10px] text-neutral-400">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="w-full min-w-0" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 370px)", alignItems: "stretch", gap: "18px" }}>
          <div className="flex min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" style={{ height: "min(58vh, 520px)", minHeight: "260px" }}>
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent calls</h3>
                <p className="mt-0.5 text-[11px] text-neutral-500">Latest call activity</p>
              </div>
              <button type="button" onClick={() => router.refresh()} className="text-xs font-semibold text-red-600 hover:text-red-700">Refresh</button>
            </div>
            {recentCalls.length ? (
              <div className="min-h-0 flex-1 divide-y divide-neutral-100 overscroll-contain dark:divide-neutral-800" style={{ minHeight: 0, overflowY: "scroll", overflowX: "hidden", flex: "1 1 0%", scrollbarGutter: "stable", overscrollBehavior: "contain" }}>
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">☎</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{call.number}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">{new Date(call.created_at).toISOString().slice(0, 16).replace('T', ' ')}</p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{call.status}</span>
                    <button type="button" onClick={() => { setNumber(call.number); }} title="Dial this number again" aria-label={`Dial ${call.number} again`} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-300">Redial</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-500 dark:bg-neutral-800">☎</div>
                <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">No calls yet</p>
                <p className="mt-1 text-xs text-neutral-400">Your call activity will appear here.</p>
              </div>
            )}
          </div>

          <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" style={{ height: "min(58vh, 520px)", minHeight: "260px" }}>
            <div className="bg-neutral-950 px-4 py-2.5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">JAAD Phone</p>
                  <p className="mt-1 text-[11px] text-neutral-400">Softphone dialler</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-neutral-200"><span className={`h-1.5 w-1.5 rounded-full ${voiceReady ? 'bg-emerald-400' : 'bg-amber-400'}`} /> {callState}</span>
              </div>
            </div>

            <form ref={formRef} action={submitCall} className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-3">
              {incomingCall && (
                <div className="mb-2 rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-2 text-center">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Incoming call</p>
                  <div className="mt-2 flex justify-center gap-2">
                    <button type="button" onClick={() => { incomingCall.reject(); setIncomingCall(null); setActiveCall(null); setCallState('Ready to call'); }} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">Decline</button>
                    <button type="button" onClick={() => { void incomingCall.accept(); setIncomingCall(null); setActiveCall(incomingCall); setCallState('Connecting…'); }} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Answer</button>
                  </div>
                </div>
              )}
              <label htmlFor="support-call-number" className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Phone number</label>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 dark:border-neutral-700 dark:bg-neutral-800">
                <span className="text-neutral-400">☎</span>
                <input
                  id="support-call-number"
                  name="number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={number}
                  onChange={(event) => { setNumber(event.target.value); setError(null); setNotice(null); }}
                  placeholder="Enter number"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-center text-lg font-semibold tracking-wider text-neutral-900 outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal dark:text-neutral-100"
                />
                <button type="button" aria-label="Delete last digit" title="Delete last digit" onClick={() => setNumber((current) => current.slice(0, -1))} className="rounded-md px-2 py-1 text-lg text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700">⌫</button>
              </div>

              <div className="mx-auto mt-2 min-h-0 w-full flex-1 grid grid-cols-3 grid-rows-4 gap-1.5">
                {keypadRows.flat().map(({ digit, letters }) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => addDigit(digit)}
                    className="flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.98] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-emerald-950/30"
                  >
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{digit}</span>
                    {letters && <span className="mt-0.5 text-[9px] font-semibold tracking-[0.2em] text-neutral-400">{letters}</span>}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex shrink-0 items-center justify-center gap-3">
                <button type="button" onClick={() => { setNumber(''); setError(null); setNotice(null); }} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Clear</button>
                {activeCall ? (
                  <button
                    type="button"
                    aria-label="End call"
                    title="End call"
                    onClick={() => {
                      if (!activeCall) return;
                      intentionalHangupRef.current = true;
                      setCallState('Ending call…');
                      activeCall.disconnect();
                    }}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-md transition hover:brightness-95 active:scale-95"
                    style={{ backgroundColor: '#dc2626', border: '1px solid #b91c1c' }}
                  >
                    <span aria-hidden="true" className="inline-block rotate-[135deg]">☎</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Start call"
                    title={isPending ? 'Calling…' : 'Call'}
                    disabled={isPending || !voiceReady || dialingRef.current}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-md transition hover:brightness-95 active:scale-95 disabled:cursor-wait disabled:opacity-80"
                    style={{ backgroundColor: '#16a34a', border: '1px solid #15803d' }}
                  >
                    <span aria-hidden="true">☎</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
    </section>
  );
}
