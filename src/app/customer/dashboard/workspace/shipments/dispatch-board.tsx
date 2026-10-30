'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateBookingStatus } from './actions';

type Booking = {
  id: string;
  tracking_no: string;
  customer_name: string;
  origin: string;
  destination: string;
  status: string;
};

const LANES = [
  { status: 'Pending', color: '#ca8a04' },
  { status: 'Assigned', color: '#2563c7' },
  { status: 'In Transit', color: '#7c3aed' },
  { status: 'Delivered', color: '#1f9d5c' },
  { status: 'Exception', color: '#e2362b' },
  { status: 'Cancelled', color: '#63676f' },
];

export default function DispatchBoard({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, bookingId: string) {
    setDraggedId(bookingId);
    setError(null);

    // Store the shipment ID in the native drag payload. This is more reliable
    // than depending only on React state when the browser fires drop.
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', bookingId);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>, status: string) {
    // A drop is only allowed when dragover is cancelled.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>, status: string) {
    // Ignore dragleave events caused by moving between children inside the lane.
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    setDragOverStatus((current) => (current === status ? null : current));
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, status: string) {
    event.preventDefault();
    event.stopPropagation();

    const idFromPayload = event.dataTransfer.getData('text/plain');
    const bookingId = idFromPayload || draggedId;
    setDragOverStatus(null);
    setDraggedId(null);

    if (!bookingId) {
      setError('Could not identify the shipment. Please drag the shipment card again.');
      return;
    }

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      setError('Shipment could not be found. Please refresh and try again.');
      return;
    }

    if (booking.status === status) return;

    setError(null);
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, status);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverStatus(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Drag a shipment card and drop it into another status to update dispatch.
        </p>
        {isPending && <span className="text-xs font-semibold text-red-600">Saving...</span>}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1260px] grid-cols-6 gap-3">
          {LANES.map((lane) => {
            const items = bookings.filter((b) => b.status === lane.status);
            const isDropTarget = dragOverStatus === lane.status;

            return (
              <div
                key={lane.status}
                onDragOver={(event) => handleDragOver(event, lane.status)}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverStatus(lane.status);
                }}
                onDragLeave={(event) => handleDragLeave(event, lane.status)}
                onDrop={(event) => handleDrop(event, lane.status)}
                className={`min-h-[360px] rounded-xl border-t-2 bg-neutral-50 p-3 transition-shadow dark:bg-neutral-900 ${
                  isDropTarget ? 'ring-2 ring-red-300 ring-inset' : ''
                }`}
                style={{ borderTopColor: lane.color }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase" style={{ color: lane.color }}>
                    {lane.status}
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: lane.color + '22', color: lane.color }}
                  >
                    {items.length}
                  </span>
                </div>

                <div className="min-h-[285px] space-y-2">
                  {items.map((booking) => (
                    <div
                      key={booking.id}
                      draggable={!isPending}
                      onDragStart={(event) => handleDragStart(event, booking.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm select-none active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-800 ${
                        draggedId === booking.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="font-mono text-[10px] font-bold text-red-600">{booking.tracking_no}</div>
                      <div className="mt-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {booking.customer_name}
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                        {booking.origin} &rarr; {booking.destination}
                      </div>
                    </div>
                  ))}

                  {!items.length && (
                    <div
                      className={`rounded-lg border border-dashed px-3 py-8 text-center text-[10px] text-neutral-400 dark:border-neutral-800 ${
                        isDropTarget ? 'border-red-300 bg-red-50/50 text-red-500 dark:border-red-700 dark:bg-red-950/20' : 'border-neutral-200'
                      }`}
                    >
                      Drop shipment here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
