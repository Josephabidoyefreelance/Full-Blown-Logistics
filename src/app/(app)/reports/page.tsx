'use client';

import { useMemo, useState } from 'react';

type ReportCategory = {
  key: string;
  name: string;
  desc: string;
  color: string;
};

const CATEGORIES: ReportCategory[] = [
  { key: 'operational', name: 'Shipment Operations', desc: 'Bookings, shipments, dispatches and delivery performance.', color: '#2563eb' },
  { key: 'crm', name: 'CRM & Leads', desc: 'Lead register, pipeline, follow-ups and conversions.', color: '#7c3aed' },
  { key: 'customers', name: 'Customer Management', desc: 'Customer records and account activity.', color: '#0891b2' },
  { key: 'fleet', name: 'Fleet Management', desc: 'Vehicles, utilisation, maintenance and fuel spend.', color: '#ea580c' },
  { key: 'drivers', name: 'Driver Management', desc: 'Driver profiles, assignments, trips and availability.', color: '#0d9488' },
  { key: 'warehouse', name: 'Warehouse & Inventory', desc: 'Stock register, SKUs, stock movements and reorder levels.', color: '#65a30d' },
  { key: 'financial', name: 'Finance', desc: 'Transactions, invoices, expenses, receivables and VAT.', color: '#16a34a' },
  { key: 'hr', name: 'HR & Careers', desc: 'Employee records, headcount, attendance and leave.', color: '#db2777' },
  { key: 'sales', name: 'Sales', desc: 'Sales pipeline, conversion and campaign performance.', color: '#d97706' },
];

export default function ReportsPage() {
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CATEGORIES.filter(c => !term || `${c.name} ${c.desc}`.toLowerCase().includes(term));
  }, [search]);

  function printReport(category: string) {
    // This endpoint must return text/html for format=print. It must not default to CSV.
    const frame = document.createElement('iframe');
    frame.title = `Print ${category} report`;
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
      border: '0',
    });
    frame.src = `/api/reports/${encodeURIComponent(category)}?format=print`;
    frame.onload = () => {
      try {
        const frameDoc = frame.contentDocument;
        const contentType = frameDoc?.contentType || '';
        const bodyText = frameDoc?.body?.innerText || '';
        if (contentType.includes('text/csv') || bodyText.trimStart().startsWith('{"error"')) {
          throw new Error('Print endpoint did not return a printable HTML report.');
        }
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch (error) {
        console.error('Print report failed:', error);
        window.alert('Print report failed because the API did not return printable HTML. Install the matching API route from the fix ZIP.');
        frame.remove();
        return;
      }
      window.setTimeout(() => frame.remove(), 3000);
    };
    frame.onerror = () => {
      frame.remove();
      window.alert('Could not load the report for printing. Check the report API route.');
    };
    document.body.appendChild(frame);
  }

  return (
    <main className="jaad-reports-page">
      <header className="jaad-reports-header">
        <div>
          <h1>Reports</h1>
          <p>Reporting and exports across JAAD ERP modules.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="jaad-button">Print page</button>
      </header>

      <section className="jaad-report-listings">
        <div className="jaad-listings-heading">
          <h2>Report listings &amp; exports</h2>
          <div className="jaad-listing-tools">
            <span>{filteredCategories.length} categories</span>
            <input
              aria-label="Find a report"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…"
            />
          </div>
        </div>

        <div className="jaad-report-grid">
          {filteredCategories.map(category => (
            <article className="jaad-report-card" key={category.key}>
              <div className="jaad-report-copy">
                <span className="jaad-category-dot" style={{ backgroundColor: category.color }} />
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.desc}</p>
                </div>
              </div>
              <div className="jaad-report-actions">
                <a className="jaad-button" href={`/api/reports/${category.key}`}>CSV</a>
                <a className="jaad-button" href={`/api/reports/${category.key}?format=xlsx`}>Excel</a>
                <a className="jaad-button jaad-button-red" href={`/api/reports/${category.key}?format=pdf`}>PDF</a>
                <button className="jaad-button" type="button" onClick={() => printReport(category.key)}>Print report</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <style jsx global>{`
        .jaad-reports-page {
          box-sizing: border-box;
          min-height: calc(100vh - 150px);
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-bottom: 12px;
        }
        .jaad-reports-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .jaad-reports-header h1 { margin: 0; font-size: 20px; font-weight: 650; color: #171717; }
        .jaad-reports-header p { margin: 4px 0 0; font-size: 12px; color: #737373; }
        .jaad-report-listings { display: flex; flex: 1; flex-direction: column; gap: 10px; }
        .jaad-listings-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .jaad-listings-heading h2 { margin: 0; font-size: 14px; font-weight: 650; color: #262626; }
        .jaad-listing-tools { display: flex; align-items: center; gap: 12px; }
        .jaad-listing-tools span { font-size: 11px; color: #737373; white-space: nowrap; }
        .jaad-listing-tools input { width: 160px; border: 1px solid #d4d4d4; border-radius: 6px; padding: 7px 10px; font-size: 12px; background: white; color: #171717; }
        .jaad-report-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: repeat(3, minmax(112px, 1fr));
          gap: 10px;
          flex: 1;
        }
        .jaad-report-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          padding: 13px;
          border: 1px solid #e5e5e5;
          border-radius: 11px;
          background: #fff;
        }
        .jaad-report-copy { display: flex; gap: 10px; align-items: flex-start; }
        .jaad-category-dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 9px; margin-top: 4px; }
        .jaad-report-card h3 { margin: 0; font-size: 12px; line-height: 1.4; font-weight: 650; color: #262626; }
        .jaad-report-card p { margin: 5px 0 0; font-size: 10px; line-height: 1.5; color: #737373; }
        .jaad-report-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .jaad-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 27px;
          border: 1px solid #d4d4d4;
          border-radius: 5px;
          background: #fff;
          color: #404040;
          padding: 5px 10px;
          font-size: 10px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .jaad-button:hover { background: #f5f5f5; }
        .jaad-button-red { background: #ed0000; color: #fff; border-color: #ed0000; }
        .jaad-button-red:hover { background: #c90000; }
        @media (min-width: 1500px) {
          .jaad-report-card { padding: 14px 16px; }
          .jaad-report-card h3 { font-size: 13px; }
          .jaad-report-card p { font-size: 11px; }
          .jaad-button { font-size: 11px; padding: 6px 11px; }
        }
        @media (max-width: 1050px) {
          .jaad-report-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: auto; }
          .jaad-report-card { min-height: 112px; }
        }
        @media (max-width: 640px) {
          .jaad-report-grid { grid-template-columns: minmax(0, 1fr); }
          .jaad-listing-tools { width: 100%; }
          .jaad-listing-tools input { flex: 1; width: auto; }
        }
        @media print {
          aside, nav, .jaad-reports-header button, .jaad-listing-tools, .jaad-report-actions { display: none !important; }
          .jaad-reports-page { min-height: 0; padding: 0; }
          .jaad-report-grid { display: block; }
          .jaad-report-card { break-inside: avoid; margin-bottom: 10px; }
        }
        .dark .jaad-reports-header h1, .dark .jaad-listings-heading h2, .dark .jaad-report-card h3 { color: #f5f5f5; }
        .dark .jaad-report-card { background: #171717; border-color: #404040; }
        .dark .jaad-report-card p, .dark .jaad-reports-header p { color: #a3a3a3; }
        .dark .jaad-button, .dark .jaad-listing-tools input { background: #171717; border-color: #525252; color: #f5f5f5; }
        .dark .jaad-button-red { background: #ed0000; border-color: #ed0000; }
      `}</style>
    </main>
  );
}
