"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start: string | { dateTime?: string; date?: string; timeZone?: string };
  end: string | { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  htmlLink?: string;
  attendees?: Array<{ email?: string; displayName?: string }>;
  color?: string;
  backgroundColor?: string;
  colorId?: string;
};

type CalendarView = "Month" | "Week" | "Day" | "Agenda";

const RED = "#d90429";
const RED_DARK = "#b60020";

function dateValue(value: CalendarEvent["start"] | CalendarEvent["end"]): Date {
  const raw = typeof value === "string" ? value : value?.dateTime || value?.date || "";
  return raw ? new Date(raw.length === 10 ? `${raw}T00:00:00` : raw) : new Date(NaN);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatTime(d: Date) {
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function eventTitle(e: CalendarEvent) {
  return e.summary?.trim() || "Untitled meeting";
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("Month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    summary: "",
    description: "",
    date: dateKey(new Date()),
    startTime: "09:00",
    endTime: "09:30",
    location: "",
    attendees: "",
    color: "#d90429",
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calendar/events", { method: "GET", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setConnected(false);
        throw new Error(data?.error || data?.message || "Could not load calendar events.");
      }
      const list = Array.isArray(data) ? data : data.events || data.items || [];
      setEvents(list);
      setConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load calendar events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("calendar_connected") === "1") {
      setConnected(true);
      void loadEvents();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadEvents]);

  const monthLabel = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const days = useMemo(() => {
    if (view === "Day") return [new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())];
    if (view === "Week") {
      const first = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
    }
    const first = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [anchor, selectedDate, view]);

  const visibleEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => !q || [e.summary, e.description, e.location].some((v) => v?.toLowerCase().includes(q)));
  }, [events, search]);

  const selectedEvents = useMemo(() => visibleEvents.filter((e) => {
    const start = dateValue(e.start);
    return !Number.isNaN(start.getTime()) && sameDay(start, selectedDate);
  }).sort((a, b) => dateValue(a.start).getTime() - dateValue(b.start).getTime()), [visibleEvents, selectedDate]);

  const move = (amount: number) => {
    if (view === "Day") setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount));
    else if (view === "Week") setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount * 7));
    else setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + amount, 1));
  };

  const openCreate = (date = selectedDate) => {
    setEditingEvent(null);
    setForm({
      summary: "",
      description: "",
      date: dateKey(date),
      startTime: "09:00",
      endTime: "09:30",
      location: "",
      attendees: "",
      color: "#d90429",
    });
    setError("");
    setCreateOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    const start = dateValue(ev.start);
    const end = dateValue(ev.end);
    const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const localTime = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setEditingEvent(ev);
    setForm({
      summary: eventTitle(ev),
      description: ev.description || "",
      date: Number.isNaN(start.getTime()) ? dateKey(selectedDate) : localDate(start),
      startTime: Number.isNaN(start.getTime()) ? "09:00" : localTime(start),
      endTime: Number.isNaN(end.getTime()) ? "09:30" : localTime(end),
      location: ev.location || "",
      attendees: (ev.attendees || []).map((a) => a.email).filter(Boolean).join(", "),
      color: ev.color || ev.backgroundColor || "#d90429",
    });
    setError("");
    setCreateOpen(true);
  };

  const createMeeting = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.summary.trim()) return;
    setSaving(true);
    setError("");
    try {
      const start = new Date(`${form.date}T${form.startTime}:00`);
      const end = new Date(`${form.date}T${form.endTime}:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        throw new Error("Please choose a valid end time after the start time.");
      }
      const attendees = form.attendees.split(",").map((s) => s.trim()).filter(Boolean).map((email) => ({ email }));
      const payload = {
        ...(editingEvent ? { id: editingEvent.id, eventId: editingEvent.id } : {}),
        summary: form.summary.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        attendees,
        color: form.color,
        backgroundColor: form.color,
      };
      const res = await fetch("/api/calendar/events", {
        method: editingEvent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || `Meeting could not be ${editingEvent ? "updated" : "created"}.`);
      setCreateOpen(false);
      setEditingEvent(null);
      setSelectedDate(new Date(`${form.date}T12:00:00`));
      setAnchor(new Date(`${form.date}T12:00:00`));
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Meeting could not be ${editingEvent ? "updated" : "created"}.`);
    } finally {
      setSaving(false);
    }
  };

  const connectGoogle = () => {
    window.location.href = "/api/calendar/google/connect";
  };

  const miniDays = useMemo(() => {
    const first = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [anchor]);

  const eventsForDay = (day: Date) => visibleEvents.filter((e) => {
    const start = dateValue(e.start);
    return !Number.isNaN(start.getTime()) && sameDay(start, day);
  }).sort((a, b) => dateValue(a.start).getTime() - dateValue(b.start).getTime());

  return (
    <main className="jaad-cal">
      <style jsx global>{`
        .jaad-cal{--jaad-red:${RED};--jaad-red-dark:${RED_DARK};--jaad-ink:#202124;--jaad-muted:#5f6368;--jaad-line:#dadce0;--jaad-bg:#fff;display:flex;flex-direction:column;min-height:calc(100vh - 104px);height:calc(100vh - 104px);background:#fff;color:var(--jaad-ink);font-family:Arial,Helvetica,sans-serif;font-size:14px}
        .jaad-cal *{box-sizing:border-box}.jc-toolbar{height:68px;display:flex;align-items:center;gap:14px;padding:0 22px;border-bottom:1px solid #eee;flex-wrap:wrap}
        .jc-brand{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:500;white-space:nowrap;margin-right:8px}.jc-logo{width:34px;height:34px;border:2px solid var(--jaad-red);border-radius:9px;color:var(--jaad-red);display:grid;place-items:center;font-size:16px;font-weight:700}
        .jc-btn{border:1px solid var(--jaad-line);background:#fff;color:var(--jaad-ink);border-radius:7px;padding:9px 14px;cursor:pointer;font-size:13px;white-space:nowrap;transition:background .15s,border .15s}.jc-btn:hover{background:#f8f9fa;border-color:#b9bdc2}.jc-btn:focus-visible,.jc-icon:focus-visible{outline:2px solid var(--jaad-red);outline-offset:2px}
        .jc-btn.primary{background:var(--jaad-red);color:#fff;border-color:var(--jaad-red);font-weight:600;box-shadow:0 1px 2px #0001}.jc-btn.primary:hover{background:var(--jaad-red-dark)}
        .jc-icon{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:#5f6368;cursor:pointer;font-size:20px}.jc-icon:hover{background:#f1f3f4}
        .jc-arrows{display:flex;align-items:center;gap:2px}.jc-title{font-size:23px;font-weight:400;min-width:170px}.jc-spacer{flex:1}.jc-search{width:min(260px,22vw);height:38px;border:1px solid transparent;border-radius:7px;background:#f1f3f4;display:flex;align-items:center;padding:0 10px;gap:7px}.jc-search input{width:100%;border:0;outline:0;background:transparent;font-size:14px}
        .jc-select{border:1px solid var(--jaad-line);border-radius:7px;padding:9px 12px;background:#fff;color:#3c4043;cursor:pointer}.jc-layout{display:grid;grid-template-columns:246px minmax(0,1fr);flex:1;min-height:0}
        .jc-sidebar{padding:18px 14px;border-right:1px solid #eee;overflow:auto}.jc-create{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;height:48px;border-radius:9px;font-size:14px;box-shadow:0 2px 5px #00000010}.jc-mini-head{display:flex;align-items:center;justify-content:space-between;margin:26px 4px 10px;font-weight:600;font-size:13px}.jc-mini-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}.jc-mini-weekday{text-align:center;font-size:10px;color:#6b7075;padding:5px 0}.jc-mini-day{border:0;background:transparent;border-radius:50%;width:27px;height:27px;justify-self:center;font-size:11px;color:#3c4043;cursor:pointer}.jc-mini-day:hover{background:#fce8ec}.jc-mini-day.outside{color:#aeb2b7}.jc-mini-day.today{color:var(--jaad-red);font-weight:700;border:1px solid var(--jaad-red)}.jc-mini-day.selected{background:var(--jaad-red);color:#fff;border-color:var(--jaad-red)}
        .jc-side-section{margin-top:27px}.jc-side-label{font-weight:600;font-size:13px;margin:0 4px 12px;display:flex;justify-content:space-between;align-items:center}.jc-calendar-check{display:flex;align-items:center;gap:9px;margin:12px 4px;color:#3c4043;font-size:13px}.jc-check{appearance:none;width:17px;height:17px;border:2px solid #aeb4ba;border-radius:4px;display:grid;place-items:center;cursor:pointer}.jc-check:checked{background:var(--jaad-red);border-color:var(--jaad-red)}.jc-check:checked:after{content:"✓";color:white;font-size:12px}
        .jc-main{min-width:0;min-height:0;display:flex;flex-direction:column;padding:14px 18px 14px;overflow:hidden}.jc-main-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;flex-shrink:0}.jc-caption{font-size:12px;color:var(--jaad-muted);margin-left:4px}.jc-grid{border:1px solid var(--jaad-line);border-radius:9px;overflow:hidden;display:flex;flex-direction:column;min-width:650px;flex:1;min-height:0}.jc-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-bottom:1px solid var(--jaad-line);background:#fff}.jc-weekday{text-align:center;padding:12px 5px 10px;font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;letter-spacing:.3px}.jc-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:repeat(6,minmax(0,1fr));flex:1;min-height:0}.jc-day-cell{position:relative;border-right:1px solid var(--jaad-line);border-bottom:1px solid var(--jaad-line);min-width:0;padding:5px 5px 4px;cursor:pointer;background:#fff}.jc-day-cell:nth-child(7n){border-right:0}.jc-day-cell:hover{background:#fffafb}.jc-day-cell.outside{background:#fafafa}.jc-day-number{display:flex;justify-content:center;align-items:center;width:27px;height:27px;border-radius:50%;font-size:12px;margin:0 auto 3px;color:#3c4043}.jc-day-cell.outside .jc-day-number{color:#9aa0a6}.jc-day-cell.today .jc-day-number{background:var(--jaad-red);color:#fff;font-weight:700}.jc-day-cell.selected{box-shadow:inset 0 0 0 2px var(--jaad-red)}.jc-event{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;border:0;border-radius:4px;padding:4px 6px;margin:2px 0;background:#fce8ec;color:#8f1026;font-size:11px;cursor:pointer}.jc-event:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--event-dot,var(--jaad-red));margin-right:5px;vertical-align:middle}.jc-event:hover{filter:brightness(.97)}.jc-more{font-size:10px;color:var(--jaad-muted);padding:3px 5px}
        .jc-agenda{margin-top:14px;border:1px solid var(--jaad-line);border-radius:9px;overflow:hidden}.jc-agenda-head{padding:14px 16px;border-bottom:1px solid var(--jaad-line);display:flex;align-items:center;justify-content:space-between}.jc-agenda-head strong{font-size:14px}.jc-agenda-date{font-size:12px;color:var(--jaad-muted);margin-top:4px}.jc-agenda-list{padding:6px 14px}.jc-agenda-row{display:grid;grid-template-columns:82px 4px minmax(0,1fr);gap:12px;align-items:start;padding:12px 3px;border-bottom:1px solid #f1f3f4}.jc-agenda-row:last-child{border-bottom:0}.jc-agenda-time{font-size:12px;color:#5f6368;padding-top:3px}.jc-agenda-bar{width:4px;min-height:35px;border-radius:4px;background:var(--jaad-red)}.jc-agenda-title{font-weight:600}.jc-agenda-meta{font-size:12px;color:var(--jaad-muted);margin-top:5px;white-space:pre-wrap}.jc-empty{text-align:center;color:#5f6368;padding:35px 10px;font-size:13px}.jc-error{background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px}.jc-loading{color:#5f6368;font-size:12px;padding:12px}
        .jc-modal-backdrop{position:fixed;inset:0;background:#20212480;z-index:1000;display:flex;align-items:center;justify-content:center;padding:18px}.jc-modal{background:#fff;width:min(560px,100%);max-height:92vh;overflow:auto;border-radius:14px;box-shadow:0 18px 60px #0003}.jc-modal-top{padding:20px 22px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee}.jc-modal-top h2{font-size:20px;font-weight:500;margin:0}.jc-form{padding:20px 22px 22px;display:flex;flex-direction:column;gap:14px}.jc-field{display:flex;flex-direction:column;gap:6px}.jc-field label{font-size:12px;color:#5f6368;font-weight:600}.jc-field input,.jc-field textarea{border:1px solid #dadce0;border-radius:7px;padding:11px 12px;font:inherit;outline:none;width:100%;background:#fff}.jc-field input:focus,.jc-field textarea:focus{border-color:var(--jaad-red);box-shadow:0 0 0 2px #d904291a}.jc-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.jc-modal-actions{display:flex;justify-content:space-between;gap:9px;margin-top:6px}.jc-color-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.jc-color-swatch{width:25px;height:25px;border-radius:50%;border:2px solid #fff;outline:1px solid #c8cdd2;cursor:pointer}.jc-color-swatch.active{outline:2px solid #202124;outline-offset:2px}.jc-connection{font-size:12px;display:flex;align-items:center;gap:6px;color:#5f6368}.jc-dot{width:8px;height:8px;border-radius:50%;background:#188038;display:inline-block}.jc-dot.off{background:#d93025}
        @media(max-width:1050px){.jc-layout{grid-template-columns:205px minmax(0,1fr)}.jc-toolbar{padding:0 14px;gap:8px}.jc-title{font-size:20px;min-width:auto}.jc-search{width:190px}.jc-main{padding:12px}.jc-sidebar{padding:14px 10px}}
        @media(max-width:760px){.jaad-cal{min-height:calc(100vh - 70px);height:auto}.jc-toolbar{height:auto;min-height:64px;padding:12px;gap:8px}.jc-brand{font-size:18px}.jc-layout{grid-template-columns:1fr}.jc-sidebar{display:none}.jc-title{font-size:18px}.jc-search{order:5;width:100%;flex:1 0 100%}.jc-spacer{flex:1}.jc-main{padding:10px;overflow:auto;min-height:70vh}.jc-main-head{align-items:flex-start}.jc-grid{min-width:650px}.jc-two{grid-template-columns:1fr}.jc-toolbar .jc-icon:nth-of-type(2){display:none}}
      `}</style>

      <header className="jc-toolbar">
        <div className="jc-brand"><span className="jc-logo">J</span><span>Calendar</span></div>
        <button className="jc-btn" onClick={() => { const now = new Date(); setAnchor(now); setSelectedDate(now); }}>Today</button>
        <div className="jc-arrows">
          <button className="jc-icon" aria-label="Previous" onClick={() => move(-1)}>‹</button>
          <button className="jc-icon" aria-label="Next" onClick={() => move(1)}>›</button>
        </div>
        <div className="jc-title">{view === "Day" ? selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : view === "Week" ? `${days[0]?.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6]?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : monthLabel}</div>
        <div className="jc-spacer" />
        {searchOpen && <label className="jc-search"><span aria-hidden="true">⌕</span><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search meetings" aria-label="Search meetings" /></label>}
        <button className="jc-icon" aria-label="Search" title="Search meetings" onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearch(""); }}>⌕</button>
        <button className="jc-icon" aria-label="Help" title="Calendar help" onClick={() => window.alert("Create a meeting, select a date, and choose Month, Week, Day, or Agenda.")}>?</button>
        <button className="jc-icon" aria-label="Refresh calendar" title="Refresh events" onClick={() => void loadEvents()}>⟳</button>
        <select className="jc-select" aria-label="Calendar view" value={view} onChange={(e) => setView(e.target.value as CalendarView)}>
          <option>Month</option><option>Week</option><option>Day</option>
        </select>
        <button className="jc-btn primary" onClick={() => openCreate(selectedDate)}>＋ Create</button>
      </header>

      <div className="jc-layout">
        <aside className="jc-sidebar">
          <button className="jc-btn primary jc-create" onClick={() => openCreate(selectedDate)}>＋ <span>Create meeting</span></button>
          <div className="jc-mini-head">
            <span>{monthLabel}</span>
            <span><button className="jc-icon" aria-label="Previous month" onClick={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button><button className="jc-icon" aria-label="Next month" onClick={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button></span>
          </div>
          <div className="jc-mini-grid">
            {["S","M","T","W","T","F","S"].map((d, i) => <div className="jc-mini-weekday" key={`${d}-${i}`}>{d}</div>)}
            {miniDays.map((d) => <button key={dateKey(d)} className={`jc-mini-day ${d.getMonth() !== anchor.getMonth() ? "outside" : ""} ${sameDay(d, new Date()) ? "today" : ""} ${sameDay(d, selectedDate) ? "selected" : ""}`} onClick={() => { setSelectedDate(d); if (view === "Month") setAnchor(new Date(d.getFullYear(), d.getMonth(), 1)); }} aria-label={d.toDateString()}>{d.getDate()}</button>)}
          </div>
          <section className="jc-side-section">
            <div className="jc-side-label"><span>My calendars</span><span style={{ color: "#777" }}>⌃</span></div>
            <label className="jc-calendar-check"><input className="jc-check" type="checkbox" defaultChecked /> My JAAD calendar</label>
            <label className="jc-calendar-check"><input className="jc-check" type="checkbox" defaultChecked /> Meetings</label>
          </section>
          <section className="jc-side-section">
            <div className="jc-side-label"><span>Calendar status</span></div>
            <div className="jc-connection"><span className={`jc-dot ${connected === false || (connected === null && !!error) ? "off" : ""}`} />{connected === true ? "Google Calendar connected" : connected === false ? "Google Calendar not connected" : loading ? "Checking connection…" : error ? "Connection needs attention" : "Calendar ready"}</div>
            {connected !== true && <button className="jc-btn" style={{ width: "100%", marginTop: 12 }} onClick={connectGoogle}>Connect Google Calendar</button>}
          </section>
        </aside>

        <section className="jc-main">
          {error && <div className="jc-error"><strong>Calendar notice:</strong> {error} <button className="jc-btn" style={{ marginLeft: 8, padding: "4px 8px" }} onClick={() => void loadEvents()}>Try again</button></div>}
          <div className="jc-main-head">
            <span className="jc-caption">{loading ? "Syncing events…" : `${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"} loaded`}</span>
            <div className="jc-spacer" />
            <button className="jc-btn" onClick={() => void loadEvents()}>Refresh</button>
          </div>

          <div className="jc-grid">
              <div className="jc-weekdays">{(view === "Day" ? [selectedDate] : view === "Week" ? days : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]).map((d, i) => <div className="jc-weekday" key={i}>{d instanceof Date ? d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }) : d}</div>)}</div>
              <div className="jc-month-grid" style={view === "Week" ? { gridTemplateRows: "minmax(390px, 1fr)" } : view === "Day" ? { gridTemplateColumns: "1fr", gridTemplateRows: "minmax(390px, 1fr)" } : undefined}>
                {(view === "Day" ? [selectedDate] : days).map((day, index) => {
                  const dayEvents = eventsForDay(day);
                  return <div key={`${dateKey(day)}-${index}`} className={`jc-day-cell ${view === "Month" && day.getMonth() !== anchor.getMonth() ? "outside" : ""} ${sameDay(day, new Date()) ? "today" : ""} ${sameDay(day, selectedDate) ? "selected" : ""}`} onClick={() => setSelectedDate(day)} onDoubleClick={() => openCreate(day)} role="button" tabIndex={0} aria-label={`Select ${day.toDateString()}`} onKeyDown={(e) => { if (e.key === "Enter") setSelectedDate(day); if (e.key === "n" || e.key === "N") openCreate(day); }}>
                    <div className="jc-day-number">{day.getDate()}</div>
                    {dayEvents.slice(0, view === "Month" ? 3 : 12).map((ev) => <button key={ev.id} className="jc-event" style={{ backgroundColor: ev.color || ev.backgroundColor || "#fce8ec", color: (ev.color || ev.backgroundColor) ? "#fff" : "#8f1026", ["--event-dot" as string]: ev.color || ev.backgroundColor || "#d90429" } as React.CSSProperties} title={`${eventTitle(ev)}${formatTime(dateValue(ev.start)) ? ` · ${formatTime(dateValue(ev.start))}` : ""} — click to edit`} onClick={(e) => { e.stopPropagation(); setSelectedDate(day); openEdit(ev); }}>{eventTitle(ev)}</button>)}
                    {dayEvents.length > (view === "Month" ? 3 : 12) && <div className="jc-more">+{dayEvents.length - (view === "Month" ? 3 : 12)} more</div>}
                    {view !== "Month" && dayEvents.map((ev) => <div key={`time-${ev.id}`} style={{ fontSize: 11, color: "#5f6368", padding: "3px 5px" }}>{formatTime(dateValue(ev.start))} · {eventTitle(ev)}</div>)}
                  </div>;
                })}
              </div>
            </div>
        </section>
      </div>

      {createOpen && <div className="jc-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
        <section className="jc-modal" role="dialog" aria-modal="true" aria-labelledby="jc-create-title">
          <div className="jc-modal-top"><h2 id="jc-create-title">{editingEvent ? "Edit meeting" : "Create meeting"}</h2><button className="jc-icon" aria-label="Close" onClick={() => setCreateOpen(false)}>×</button></div>
          <form className="jc-form" onSubmit={createMeeting}>
            <div className="jc-field"><label htmlFor="jc-summary">Meeting title *</label><input id="jc-summary" required autoFocus value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="e.g. Client consultation" /></div>
            <div className="jc-two"><div className="jc-field"><label htmlFor="jc-date">Date</label><input id="jc-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div><div className="jc-field"><label htmlFor="jc-location">Location / meeting link</label><input id="jc-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Office or video link" /></div></div>
            <div className="jc-two"><div className="jc-field"><label htmlFor="jc-start">Start time</label><input id="jc-start" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div><div className="jc-field"><label htmlFor="jc-end">End time</label><input id="jc-end" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div></div>
            <div className="jc-field"><label htmlFor="jc-attendees">Invitees' email addresses</label><input id="jc-attendees" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="name@example.com, another@example.com" /><span style={{ fontSize: 11, color: "#777" }}>Separate multiple email addresses with commas.</span></div>
            <div className="jc-field"><label htmlFor="jc-description">Description</label><textarea id="jc-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add meeting details" /></div>
            <div className="jc-field"><label>Calendar colour</label><div className="jc-color-row">{["#d90429", "#4285f4", "#8e44ad", "#0f9d58", "#f4b400", "#ff6d01", "#00acc1", "#5f6368"].map((colour) => <button type="button" key={colour} aria-label={`Choose ${colour} calendar colour`} title={colour} className={`jc-color-swatch ${form.color === colour ? "active" : ""}`} style={{ background: colour }} onClick={() => setForm({ ...form, color: colour })} />)}</div></div>
            {error && <div className="jc-error">{error}</div>}
            <div className="jc-modal-actions"><button type="button" className="jc-btn" onClick={() => { setCreateOpen(false); setEditingEvent(null); }}>Cancel</button><div style={{ display: "flex", gap: 9 }}><button type="submit" className="jc-btn primary" disabled={saving}>{saving ? "Saving…" : editingEvent ? "Save changes" : "Save meeting"}</button></div></div>
          </form>
        </section>
      </div>}
    </main>
  );
}
