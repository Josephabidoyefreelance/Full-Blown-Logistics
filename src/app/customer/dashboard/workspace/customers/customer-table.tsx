'use client';

import { useMemo, useState } from 'react';
import AssignedToSwitch from './assigned-to-switch';
import StatusSwitch from './status-switch';
import CustomerDetailTrigger from './customer-detail-modal';

type Staff = { id: string; full_name: string | null };

type Customer = {
  id: string;
  name: string;
  type: string;
  contact: string | null;
  credit_limit: number;
  balance: number | null;
  status: string;
  client_since: string | null;
  assigned_to: string | null;
  currency?: string | null;
  tax_rate?: number | null;
};

function nairaFmt(n: number) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default function CustomerTable({ customers, staff }: { customers: Customer[]; staff: Staff[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [assigned, setAssigned] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery = !q || [customer.name, customer.contact ?? '', customer.type].join(' ').toLowerCase().includes(q);
      const matchesStatus = status === 'All' || customer.status === status;
      const matchesType = type === 'All' || customer.type === type;
      const matchesAssigned = assigned === 'All' || (assigned === 'None' ? !customer.assigned_to : customer.assigned_to === assigned);
      return matchesQuery && matchesStatus && matchesType && matchesAssigned;
    });
  }, [customers, query, status, type, assigned]);

  const inputClass =
    'h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-xs text-neutral-800 outline-none focus:border-red-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200';

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers..."
          className={`${inputClass} w-[230px] max-w-full`}
          aria-label="Search customers"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass} aria-label="Filter by status">
          <option value="All">All status</option>
          <option value="Active">Active</option>
          <option value="On hold">On hold</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass} aria-label="Filter by customer type">
          <option value="All">All types</option>
          <option value="B2B">B2B</option>
          <option value="B2C">B2C</option>
        </select>
        <select value={assigned} onChange={(e) => setAssigned(e.target.value)} className={`${inputClass} max-w-[150px]`} aria-label="Filter by assignee">
          <option value="All">All assignees</option>
          <option value="None">Unassigned</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>{member.full_name || 'Unnamed'}</option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-neutral-400">{filtered.length} of {customers.length} customers</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[7%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[7%]" />
            <col className="w-[16%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Contact</th>
              <th className="px-3 py-2.5 font-medium">Credit limit</th>
              <th className="px-3 py-2.5 font-medium">Balance</th>
              <th className="px-3 py-2.5 font-medium">Since</th>
              <th className="px-3 py-2.5 font-medium">Assigned to</th>
              <th className="px-1 py-2.5 pr-0 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <tr key={customer.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="truncate px-4 py-2.5">
                  <CustomerDetailTrigger customer={customer} staff={staff} />
                </td>
                <td className="truncate px-3 py-2.5 text-neutral-700 dark:text-neutral-300">{customer.type}</td>
                <td className="truncate px-3 py-2.5 text-neutral-700 dark:text-neutral-300">{customer.contact || '—'}</td>
                <td className="truncate px-3 py-2.5 text-neutral-900 dark:text-neutral-100">{nairaFmt(customer.credit_limit)}</td>
                <td className="truncate px-3 py-2.5 text-neutral-900 dark:text-neutral-100">
                  {customer.balance ? nairaFmt(customer.balance) : '—'}
                </td>
                <td className="truncate px-3 py-2.5 text-neutral-700 dark:text-neutral-300">{customer.client_since || '—'}</td>
                <td className="px-3 py-2.5">
                  <AssignedToSwitch id={customer.id} assignedTo={customer.assigned_to ?? null} staff={staff} />
                </td>
                <td className="px-1 py-2.5 pr-0 text-right">
                  <span className="inline-flex w-full justify-end"><StatusSwitch id={customer.id} status={customer.status} /></span>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">
                  {customers.length ? 'No customers match your filters.' : 'No customers yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
