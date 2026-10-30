'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLeaveStatus } from './actions';

type LeaveRecord = {
  id: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: string;
};

const LANES = [
  { status: 'Pending', title: 'Pending', description: 'New requests', tone: 'slate', header: 'bg-slate-100 text-slate-800 border-slate-200', panel: 'bg-slate-50/80 border-slate-200', card: 'border-slate-200 hover:border-slate-300', badge: 'bg-slate-100 text-slate-700' },
  { status: 'Awaiting Approval', title: 'Awaiting approval', description: 'Waiting for HR decision', tone: 'amber', header: 'bg-amber-100 text-amber-900 border-amber-200', panel: 'bg-amber-50/70 border-amber-200', card: 'border-amber-200 hover:border-amber-300', badge: 'bg-amber-100 text-amber-800' },
  { status: 'Approved', title: 'Approved', description: 'Leave authorised', tone: 'green', header: 'bg-emerald-100 text-emerald-900 border-emerald-200', panel: 'bg-emerald-50/70 border-emerald-200', card: 'border-emerald-200 hover:border-emerald-300', badge: 'bg-emerald-100 text-emerald-800' },
  { status: 'Declined', title: 'Declined', description: 'Not approved', tone: 'red', header: 'bg-red-100 text-red-900 border-red-200', panel: 'bg-red-50/70 border-red-200', card: 'border-red-200 hover:border-red-300', badge: 'bg-red-100 text-red-800' },
] as const;

function prettyDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeavePipeline({ leaves }: { leaves?: LeaveRecord[] | null }) {
  const safeLeaves: LeaveRecord[] = Array.isArray(leaves) ? leaves : [];
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function moveLeave(id: string, status: string) {
    const leave = safeLeaves.find((item) => item.id === id);
    if (!leave || leave.status === status) return;
    setBusyId(id);
    setMessage('');
    startTransition(async () => {
      const result = await setLeaveStatus(id, status);
      if (result?.error) setMessage(`Could not move leave request: ${result.error}`);
      else setMessage(`${leave.employee_name}'s leave request moved to ${status}.`);
      setBusyId(null);
      setDraggedId(null);
      router.refresh();
    });
  }

  const counts = Object.fromEntries(LANES.map((lane) => [lane.status, safeLeaves.filter((leave) => leave.status === lane.status).length])) as Record<string, number>;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Leave pipeline</h2>
          <p className="mt-1 text-xs text-neutral-500">Drag a request between stages. Each stage has its own colour for quick recognition.</p>
        </div>
        <p className="text-xs text-neutral-500">{safeLeaves.length} total request{leaves.length === 1 ? '' : 's'}</p>
      </div>
      {message && <div role="status" className={`mb-4 rounded-lg border px-3 py-2 text-sm ${message.startsWith('Could not') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message}</div>}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        {LANES.map((lane) => {
          const items = safeLeaves.filter((leave) => leave.status === lane.status);
          return (
            <div key={lane.status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || draggedId; if (id) moveLeave(id, lane.status); }} className={`flex min-h-[250px] flex-col overflow-hidden rounded-xl border ${lane.panel} ${draggedId ? 'transition-shadow' : ''}`}>
              <div className={`border-b px-4 py-3 ${lane.header}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide">{lane.title}</h3>
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-white/80 px-2 py-1 text-xs font-bold tabular-nums">{counts[lane.status] ?? 0}</span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">{lane.description}</p>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-3">
                {items.map((leave) => (
                  <article key={leave.id} draggable={!isPending} onDragStart={(event) => { setDraggedId(leave.id); event.dataTransfer.setData('text/plain', leave.id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedId(null)} className={`cursor-grab rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${lane.card} ${draggedId === leave.id ? 'opacity-50' : ''} ${busyId === leave.id ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-neutral-900">{leave.employee_name}</h4>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${lane.badge}`}>{lane.title}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-neutral-600">{leave.leave_type}</p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
                      <span>{prettyDate(leave.from_date)}</span><span aria-hidden="true">→</span><span>{prettyDate(leave.to_date)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2">
                      <span className="text-[10px] text-neutral-400">{busyId === leave.id ? 'Updating…' : 'Drag to move'}</span>
                      <label className="sr-only" htmlFor={`leave-stage-${leave.id}`}>Change stage for {leave.employee_name}</label>
                      <select id={`leave-stage-${leave.id}`} value={leave.status} disabled={isPending} onChange={(event) => moveLeave(leave.id, event.target.value)} className="max-w-[145px] rounded-md border border-neutral-200 bg-white px-2 py-1 text-[10px] font-semibold text-neutral-700 outline-none focus:border-red-400">
                        {LANES.map((option) => <option key={option.status} value={option.status}>{option.title}</option>)}
                      </select>
                    </div>
                  </article>
                ))}
                {!items.length && <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-300/80 px-4 py-8 text-center text-xs text-neutral-400">Drop a request here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
