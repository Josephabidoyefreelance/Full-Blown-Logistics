'use client';

import { useMemo, useState, useTransition } from 'react';
import type { DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import LeadDetailTrigger from './lead-detail-modal';
import { seedDemoLeads, updateLeadStatus } from './actions';

const LANES = [
  { label: 'New', status: 'New', color: '#2563c7' },
  { label: 'Contacted', status: 'Contacted', color: '#ca8a04' },
  { label: 'Won', status: 'Won', color: '#1f9d5c' },
  { label: 'Lost', status: 'Lost', color: '#e2362b' },
] as const;

type Lead = {
  id: string;
  company: string;
  contact_name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  priority: string;
  status: string;
  value: number | string | null;
  assigned_to?: string | null;
  source?: string | null;
  transport_mode?: string | null;
  origin?: string | null;
  destination?: string | null;
  callback_date?: string | null;
};

type Staff = { id: string; full_name: string | null };

function nairaFmt(n: number | string | null | undefined) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function laneForStatus(status: string) {
  if (status === 'New') return 'New';
  if (status === 'Won') return 'Won';
  if (status === 'Lost') return 'Lost';
  return 'Contacted';
}

export default function KanbanBoard({ leads, staff }: { leads: Lead[]; staff: Staff[] }) {
  const router = useRouter();
  const [items, setItems] = useState(leads);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [demoPending, setDemoPending] = useState(false);

  const grouped = useMemo(() => {
    return LANES.reduce<Record<string, Lead[]>>((acc, lane) => {
      acc[lane.label] = items.filter((lead) => laneForStatus(lead.status) === lane.label);
      return acc;
    }, {});
  }, [items]);

  function moveLead(id: string, nextStatus: string) {
    const current = items.find((lead) => lead.id === id);
    if (!current || current.status === nextStatus) return;

    const previous = items;
    setItems((currentItems) =>
      currentItems.map((lead) => (lead.id === id ? { ...lead, status: nextStatus } : lead)),
    );
    setDraggedId(null);
    setDragOverLane(null);

    startTransition(async () => {
      const result = await updateLeadStatus(id, nextStatus);
      if (result?.error) {
        setItems(previous);
        window.alert(`Could not move lead: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, id: string) {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, status: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggedId;
    if (id) moveLead(id, status);
  }

  async function loadDemoLeads() {
    setDemoPending(true);
    const result = await seedDemoLeads();
    setDemoPending(false);
    if (result?.error) {
      window.alert(`Could not load demo leads: ${result.error}`);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Drag a lead card into another column to change its pipeline status.
        </p>
        {!items.length && (
          <button
            type="button"
            onClick={loadDemoLeads}
            disabled={demoPending}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {demoPending ? 'Loading demo leads…' : 'Load demo leads'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {LANES.map((lane) => {
          const laneItems = grouped[lane.label] ?? [];
          const active = dragOverLane === lane.label;

          return (
            <div
              key={lane.label}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverLane(lane.label);
              }}
              onDragLeave={() => setDragOverLane(null)}
              onDrop={(event) => handleDrop(event, lane.status)}
              className={`min-h-[150px] rounded-xl border-t-2 bg-neutral-50 p-3 transition dark:bg-neutral-900 ${
                active ? 'ring-2 ring-red-200 dark:ring-red-900/50' : ''
              }`}
              style={{ borderTopColor: lane.color }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase" style={{ color: lane.color }}>
                  {lane.label}
                </h4>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: lane.color + '22', color: lane.color }}
                >
                  {laneItems.length}
                </span>
              </div>

              {laneItems.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, lead.id)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverLane(null);
                  }}
                  className={`mb-2 cursor-grab rounded-lg border border-neutral-200 bg-white p-2.5 shadow-sm transition active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-800 ${
                    draggedId === lead.id ? 'opacity-50' : ''
                  }`}
                >
                  <div onClick={(event) => event.stopPropagation()}>
                    <LeadDetailTrigger lead={lead} staff={staff} />
                  </div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {lead.contact_name} · {nairaFmt(lead.value)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
                    <span>{lead.priority}</span>
                    <span>Drag ↕</span>
                  </div>
                </div>
              ))}

              {!laneItems.length && (
                <div className={`rounded-lg border border-dashed py-7 text-center text-xs ${active ? 'border-red-300 text-red-500' : 'border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600'}`}>
                  {active ? 'Drop lead here' : 'No leads'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isPending && (
        <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-500">Saving pipeline change…</p>
      )}
    </div>
  );
}
