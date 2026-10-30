// Legacy duplicate from the earlier customer route. The active ERP status switch is in
// ./workspace/customers/status-switch.tsx.
export default function LegacyCustomerStatusSwitch({ status }: { status: string }) {
  return <span>{status}</span>;
}
