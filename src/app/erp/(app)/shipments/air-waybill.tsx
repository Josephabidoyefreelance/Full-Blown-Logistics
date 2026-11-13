import Image from 'next/image';

type CargoItem = {
  id: string;
  quantity: string;
  gross_weight: string;
  unit: string;
  rate_class: string;
  chargeable_weight: string;
  description: string;
};

type Booking = {
  tracking_no: string;
  status: string;
  origin: string;
  destination: string;
  customer_name: string;
  sender_address?: string | null;
  sender_phone?: string | null;
  receiver_name?: string | null;
  receiver_address?: string | null;
  receiver_phone?: string | null;
  declared_value_customs?: string | null;
  insurance_amount?: number | null;
  freight_terms?: string | null;
};

const STAMP_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Assigned: '#2563c7',
  'In Transit': '#7c3aed',
  Delivered: '#1f9d5c',
  Exception: '#e2362b',
  Cancelled: '#63676f',
};

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default function AirWaybill({ booking, cargoItems }: { booking: Booking; cargoItems: CargoItem[] }) {
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

      <div className="mb-4 grid grid-cols-2 border border-neutral-300 text-sm">
        <div className="border-r border-neutral-300 p-3">
          <div className="mb-1 font-bold">SHIPPER:</div>
          <div>{booking.customer_name}</div>
          <div>{booking.sender_address || '\u2014'}</div>
          <div>TEL: {booking.sender_phone || '\u2014'}</div>
        </div>
        <div className="p-3">
          <div className="mb-1 font-bold">AIR WAYBILL NO:</div>
          <div className="font-mono font-semibold text-red-600">{booking.tracking_no}</div>
          <div className="mt-1 font-bold">ISSUED BY:</div>
          <div>{booking.customer_name}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 border border-neutral-300 text-sm">
        <div className="border-r border-neutral-300 p-3">
          <div className="mb-1 font-bold">RECEIVER:</div>
          <div>{booking.receiver_name || '\u2014'}</div>
          <div>{booking.receiver_address || '\u2014'}</div>
          <div>CONTACT: {booking.receiver_phone || '\u2014'}</div>
        </div>
        <div className="p-3">
          <div className="mb-1 font-bold">PLACE OF DEPARTURE</div>
          <div>{booking.origin}</div>
          <div className="mb-1 mt-2 font-bold">PLACE OF ARRIVAL</div>
          <div>{booking.destination}</div>
        </div>
      </div>

      <table className="mb-4 w-full border border-neutral-300 text-sm">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">No. of Pieces</th>
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">Gross Weight</th>
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">Unit</th>
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">Rate Class</th>
            <th className="border-r border-neutral-300 px-2 py-1.5 text-left">Chargeable Weight</th>
            <th className="px-2 py-1.5 text-left">Nature and Quantity of Goods</th>
          </tr>
        </thead>
        <tbody>
          {cargoItems.length > 0 ? (
            cargoItems.map((it) => (
              <tr key={it.id} className="border-b border-neutral-200">
                <td className="border-r border-neutral-300 px-2 py-1.5">{it.quantity}</td>
                <td className="border-r border-neutral-300 px-2 py-1.5">{it.gross_weight || '----------'}</td>
                <td className="border-r border-neutral-300 px-2 py-1.5">{it.unit}</td>
                <td className="border-r border-neutral-300 px-2 py-1.5">{it.rate_class || '----------'}</td>
                <td className="border-r border-neutral-300 px-2 py-1.5">{it.chargeable_weight}</td>
                <td className="px-2 py-1.5 font-medium">{it.description}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-2 py-3 text-center text-neutral-400">
                No cargo items on file
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mb-4 grid grid-cols-3 border border-neutral-300 text-sm">
        <div className="border-r border-neutral-300 p-3">
          <div className="font-bold">DECLARED VALUE FOR CARRIAGE</div>
          <div>NVD</div>
        </div>
        <div className="border-r border-neutral-300 p-3">
          <div className="font-bold">DECLARED VALUE FOR CUSTOMS</div>
          <div>{booking.declared_value_customs || 'NCV'}</div>
        </div>
        <div className="p-3">
          <div className="font-bold">AMOUNT OF INSURANCE</div>
          <div>{booking.insurance_amount ? nairaFmt(booking.insurance_amount) : 'NIL'}</div>
        </div>
        <div className="col-span-3 border-t border-neutral-300 p-3">
          <div className="font-bold">FREIGHT CHARGES</div>
          <div>{booking.freight_terms || '\u2014'}</div>
        </div>
      </div>

      <div className="mb-4 border border-neutral-300 p-3 text-sm">
        <div className="mb-1 font-bold">SHIPPER&apos;S CERTIFICATION:</div>
        <div className="text-neutral-700">
          The shipper certifies that the particulars on the face hereof are correct and that insofar as any part
          of the consignment contains dangerous goods, such part is properly described by name and is in proper
          condition for carriage by air according to the applicable Dangerous Goods Regulations.
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 border border-neutral-300 text-sm">
        <div className="border-r border-neutral-300 p-3">
          <div className="mb-3 font-bold">NAME &amp; SIGNATURE OF RECEIVER</div>
          <div className="border-t border-neutral-400" />
        </div>
        <div className="p-3">
          <div className="mb-3 font-bold">DATE &amp; PLACE OF RECEIVER</div>
          <div className="border-t border-neutral-400" />
        </div>
      </div>

      <div className="text-center text-xs text-neutral-500">
        Question? Email us at info@jaadlogistics.com or call us at +234-707-568-8573
      </div>
      <div className="mt-2 border-t border-red-600 pt-2 text-center text-xs text-neutral-500">
        Your perfect partner to bring creativity to reality
      </div>
    </div>
  );
}
