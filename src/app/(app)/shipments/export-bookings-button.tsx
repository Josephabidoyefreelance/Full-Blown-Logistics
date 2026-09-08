'use client';

type Booking = {
  tracking_no: string;
  customer_name: string;
  origin: string;
  destination: string;
  type: string;
  status: string;
  pickup_date: string;
  declared_value: number;
};

function csvEscape(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ExportBookingsButton({ bookings }: { bookings: Booking[] }) {
  function handleExport() {
    const headers = ['Tracking no', 'Customer', 'Origin', 'Destination', 'Type', 'Status', 'Pickup', 'Value'];
    const rows = bookings.map((b) => [
      b.tracking_no,
      b.customer_name,
      b.origin,
      b.destination,
      b.type,
      b.status,
      b.pickup_date,
      String(b.declared_value ?? 0),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      Export CSV
    </button>
  );
}
