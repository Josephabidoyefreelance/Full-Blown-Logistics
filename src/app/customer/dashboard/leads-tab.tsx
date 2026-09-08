'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Lead = {
  id: string;
  name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  priority: string;
  transport_mode: string | null;
  origin: string | null;
  destination: string | null;
  deal_value: number | null;
  call_back_date: string | null;
};

type LeadNote = {
  id: string;
  lead_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
const PRIORITY_OPTIONS = ['Cold', 'Warm', 'Hot'];

const STATUS_COLORS: Record<string, string> = {
  New: '#2563c7',
  Contacted: '#ca8a04',
  Qualified: '#7c3aed',
  Won: '#1f9d5c',
  Lost: '#9a9aa0',
};

const PRIORITY_COLORS: Record<string, string> = {
  Cold: '#3b82f6',
  Warm: '#ca8a04',
  Hot: '#b8140d',
};

const emptyForm = {
  name: '',
  company: '',
  job_title: '',
  email: '',
  phone: '',
  source: '',
  status: 'New',
  priority: 'Warm',
  transport_mode: '',
  origin: '',
  destination: '',
  deal_value: '',
  call_back_date: '',
};

function LeadDetailModal({ lead, onClose, onUpdated }: { lead: Lead; onClose: () => void; onUpdated: () => void }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [callBackDate, setCallBackDate] = useState(lead.call_back_date ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNotes() {
    setLoadingNotes(true);
    const { data } = await supabase
      .from('customer_lead_notes')
      .select('id, lead_id, author_name, content, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true });
    setNotes(data ?? []);
    setLoadingNotes(false);
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('customer_lead_notes').insert({
      lead_id: lead.id,
      author_name: authorName || null,
      content: noteContent,
    });
    setSaving(false);
    if (!error) {
      setNoteContent('');
      loadNotes();
    }
  }

  async function handleCallBackDateChange(value: string) {
    setCallBackDate(value);
    await supabase.from('customer_leads').update({ call_back_date: value || null }).eq('id', lead.id);
    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text)]">{lead.company || lead.name}</h3>
          <button onClick={onClose} className="text-[13px] font-semibold text-[var(--subtext)]">
            Close
          </button>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: (PRIORITY_COLORS[lead.priority] ?? '#9a9aa0') + '1a', color: PRIORITY_COLORS[lead.priority] ?? '#9a9aa0' }}
          >
            {lead.priority}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: (STATUS_COLORS[lead.status] ?? '#9a9aa0') + '1a', color: STATUS_COLORS[lead.status] ?? '#9a9aa0' }}
          >
            {lead.status}
          </span>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Contact</dt>
            <dd className="text-[var(--text)]">{lead.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Job title</dt>
            <dd className="text-[var(--text)]">{lead.job_title || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Email</dt>
            <dd className="text-[var(--text)]">{lead.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Phone</dt>
            <dd className="text-[var(--text)]">{lead.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Source</dt>
            <dd className="text-[var(--text)]">{lead.source || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Transport mode</dt>
            <dd className="text-[var(--text)]">{lead.transport_mode || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Origin</dt>
            <dd className="text-[var(--text)]">{lead.origin || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Destination</dt>
            <dd className="text-[var(--text)]">{lead.destination || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--subtext)]">Deal value</dt>
            <dd className="font-semibold text-[var(--text)]">
              {lead.deal_value ? `\u20a6${lead.deal_value.toLocaleString()}` : '—'}
            </dd>
          </div>
        </dl>

        <div className="mb-5 border-t border-[var(--border)] pt-4">
          <h4 className="mb-3 text-[13px] font-bold text-[var(--text)]">Notes &amp; follow up</h4>

          <div className="mb-4">
            <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Call back date</label>
            <input
              type="date"
              value={callBackDate}
              onChange={(e) => handleCallBackDateChange(e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>

          <div className="mb-3 max-h-[220px] space-y-2 overflow-y-auto rounded-md border border-[var(--border)] p-3">
            {loadingNotes ? (
              <p className="text-sm text-[var(--subtext)]">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-[var(--subtext)]">No notes yet.</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="rounded-md bg-[var(--input-bg)] p-2.5">
                  <div className="mb-1 text-[10px] text-[var(--subtext)]">
                    {n.author_name || 'Anonymous'} &middot;{' '}
                    {new Date(n.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-[var(--text)]">{n.content}</div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-2">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="What did the client say? When should we call back?"
              rows={2}
              className="resize-none rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
          <button
            onClick={handleAddNote}
            disabled={saving}
            className="mt-2 rounded-sm bg-[#e5231b] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsTab() {
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_leads')
      .select('id, name, company, job_title, email, phone, source, status, priority, transport_mode, origin, destination, deal_value, call_back_date')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    setLeads(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      name: lead.name ?? '',
      company: lead.company ?? '',
      job_title: lead.job_title ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      source: lead.source ?? '',
      status: lead.status,
      priority: lead.priority,
      transport_mode: lead.transport_mode ?? '',
      origin: lead.origin ?? '',
      destination: lead.destination ?? '',
      deal_value: lead.deal_value ? String(lead.deal_value) : '',
      call_back_date: lead.call_back_date ?? '',
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      name: form.name,
      company: form.company || null,
      job_title: form.job_title || null,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source || null,
      status: form.status,
      priority: form.priority,
      transport_mode: form.transport_mode || null,
      origin: form.origin || null,
      destination: form.destination || null,
      deal_value: form.deal_value ? Number(form.deal_value) : 0,
      call_back_date: form.call_back_date || null,
    };

    const { error } = editingId
      ? await supabase.from('customer_leads').update(payload).eq('id', editingId)
      : await supabase.from('customer_leads').insert(payload);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setShowForm(false);
    fetchLeads();
  }

  async function updateField(id: string, field: 'status' | 'priority', value: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    const { error } = await supabase.from('customer_leads').update({ [field]: value }).eq('id', id);
    if (error) {
      setError(error.message);
      fetchLeads();
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('customer_leads').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    fetchLeads();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text)]">Leads</h3>
          <p className="text-[13px] text-[var(--subtext)]">Click a company for the full CRM record.</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#c91d16]"
        >
          + Add lead
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-[13px] text-[var(--error-text)]">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 border-b border-[var(--border)] text-[11px] uppercase text-[var(--subtext)]">
            <div className="truncate px-5 py-4 text-left font-semibold">Company</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Contact</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Email</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Priority</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Status</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Deal value</div>
            <div className="truncate px-5 py-4 text-right font-semibold">Actions</div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--subtext)]">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--subtext)]">
              No leads yet. Add your first lead to get started.
            </div>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="grid grid-cols-7 border-b border-[var(--border)] text-sm last:border-b-0">
                <div className="min-w-0 truncate px-5 py-4">
                  <button
                    onClick={() => setDetailLead(lead)}
                    className="truncate text-left font-semibold text-[var(--text)] hover:text-[#e5231b] hover:underline"
                  >
                    {lead.company || lead.name}
                  </button>
                </div>
                <div className="truncate px-5 py-4 text-[var(--subtext)]">{lead.name || '—'}</div>
                <div className="truncate px-5 py-4 text-[var(--subtext)]">{lead.email || '—'}</div>
                <div className="truncate px-5 py-4">
                  <select
                    value={lead.priority}
                    onChange={(e) => updateField(lead.id, 'priority', e.target.value)}
                    className="inline-block w-auto rounded-full border-0 px-3 py-1.5 text-[13px] font-semibold outline-none"
                    style={{ backgroundColor: (PRIORITY_COLORS[lead.priority] ?? '#9a9aa0') + '1a', color: PRIORITY_COLORS[lead.priority] ?? '#9a9aa0' }}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="truncate px-5 py-4">
                  <select
                    value={lead.status}
                    onChange={(e) => updateField(lead.id, 'status', e.target.value)}
                    className="inline-block w-auto rounded-full border-0 px-3 py-1.5 text-[13px] font-semibold outline-none"
                    style={{ backgroundColor: (STATUS_COLORS[lead.status] ?? '#9a9aa0') + '1a', color: STATUS_COLORS[lead.status] ?? '#9a9aa0' }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="truncate px-5 py-4 text-[var(--text)]">
                  {lead.deal_value ? `\u20a6${lead.deal_value.toLocaleString()}` : '—'}
                </div>
                <div className="px-5 py-4">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(lead)}
                      className="rounded-sm border border-[var(--input-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="rounded-sm border border-[var(--error-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">{editingId ? 'Edit lead' : 'Add lead'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-[13px] font-semibold text-[var(--subtext)]">
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Company</label>
                  <input
                    required
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Contact name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Job title</label>
                  <input
                    value={form.job_title}
                    onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Source</label>
                  <input
                    placeholder="e.g. Website"
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Transport mode</label>
                  <input
                    placeholder="e.g. Trucks / Haulage"
                    value={form.transport_mode}
                    onChange={(e) => setForm((f) => ({ ...f, transport_mode: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Deal value</label>
                  <input
                    type="number"
                    value={form.deal_value}
                    onChange={(e) => setForm((f) => ({ ...f, deal_value: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Origin</label>
                  <input
                    value={form.origin}
                    onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Destination</label>
                  <input
                    value={form.destination}
                    onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Call back date</label>
                <input
                  type="date"
                  value={form.call_back_date}
                  onChange={(e) => setForm((f) => ({ ...f, call_back_date: e.target.value }))}
                  className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add lead'}
            </button>
          </form>
        </div>
      )}

      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => { setDetailLead(null); fetchLeads(); }}
          onUpdated={fetchLeads}
        />
      )}
    </div>
  );
}
