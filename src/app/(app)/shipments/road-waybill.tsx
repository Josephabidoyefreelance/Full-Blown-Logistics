import Image from 'next/image';

type CargoItem = {
  id: string;
  description: string;
  quantity: string;
};

type Booking = {
  tracking_no: string;
  status: string;
  pickup_date: string;
  origin: string;
  destination: string;
  sender_name?: string | null;
  sender_address?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
  receiver_name?: string | null;
  receiver_address?: string | null;
  receiver_phone?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  checked_by?: string | null;
  dispatched_by?: string | null;
};

const STAMP_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Assigned: '#2563c7',
  'In Transit': '#7c3aed',
  Delivered: '#1f9d5c',
  Exception: '#e2362b',
  Cancelled: '#63676f',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-neutral-600">{label}: </span>
      <span className="font-medium text-neutral-900">{value || '\u2014'}</span>
    </div>
  );
}

export default function RoadWaybill({ booking, cargoItems }: { booking: Booking; cargoItems: CargoItem[] }) {
  const stampColor = STAMP_COLORS[booking.status] ?? '#888';

  return (
    <div className="relative text-neutral-900">
      <div
        className="pointer-events-none absolute right-2 top-2 -rotate-[14deg] select-none rounded-md border-4 px-4 py-1 text-xl font-black uppercase tracking-widest opacity-80"
        style={{ borderColor: stampColor, color: stampColor }}
      >
        {booking.status}
      </div>

      <div className="mb-4 flex justify-center">
        <Image src="/logo.png" alt="JAAD Logistics" width={64} height={64} className="rounded" />
      </div>
      <h2 className="mb-5 text-center text-base font-bold">OFFICIAL WAYBILL</h2>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Row label="Company Name" value="Jaad Logistics" />
        <Row label="Address" value="64a Olushi Street, Lagos Island Lagos" />
        <Row label="Phone" value="08061472153" />
        <Row label="Email" value="info@jaadlogistics.com" />
      </div>

      <h3 className="mb-1 mt-4 text-sm font-bold">WAYBILL INFORMATION</h3>
      <Row label="Waybill Date" value={booking.pickup_date} />
      <Row label="Waybill Reference Number" value={booking.tracking_no} />

      <h3 className="mb-2 mt-4 text-sm font-bold">PARTIES INFORMATION</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 text-sm font-bold">Sender (Consignor)</div>
          <Row label="Name" value={booking.sender_name || ''} />
          <Row label="Address" value={booking.sender_address || ''} />
          <Row label="Email" value={booking.sender_email || ''} />
          <Row label="Phone" value={booking.sender_phone || ''} />
        </div>
        <div>
          <div className="mb-1 text-sm font-bold">Receiver (Consignee)</div>
          <Row label="Name" value={booking.receiver_name || ''} />
          <Row label="Address" value={booking.receiver_address || ''} />
          <Row label="Phone" value={booking.receiver_phone || ''} />
        </div>
      </div>

      <h3 className="mb-2 mt-4 text-sm font-bold">SHIPMENT DETAILS</h3>
      <table className="w-full border border-neutral-300 text-sm">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">S/No</th>
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">Item description details</th>
            <th className="px-2 py-1.5 text-left">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {cargoItems.length > 0 ? (
            cargoItems.map((it, i) => (
              <tr key={it.id} className="border-b border-neutral-200">
                <td className="border-r border-neutral-300 px-2 py-1.5">{i + 1}</td>
                <td className="border-r border-neutral-300 px-2 py-1.5">{it.description}</td>
                <td className="px-2 py-1.5">{it.quantity}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-2 py-3 text-center text-neutral-400">
                No cargo items on file
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 className="mb-1 mt-4 text-sm font-bold">TRANSPORT INFORMATION</h3>
      <div className="grid grid-cols-2 gap-4">
        <Row label="Vehicle Number" value={booking.vehicle_number || ''} />
        <Row label="Driver Name" value={booking.driver_name || ''} />
        <Row label="Driver Number" value={booking.driver_phone || ''} />
        <Row label="Route" value={`${booking.origin} \u2013 ${booking.destination}`} />
      </div>

      <h3 className="mb-1 mt-4 text-sm font-bold">TERMS &amp; CONDITIONS</h3>
      <ul className="ml-4 list-disc text-sm text-neutral-700">
        <li>Company is not liable for concealed damages.</li>
        <li>Claims must be reported within 24 hours of delivery.</li>
      </ul>
    </div>
  );
}
