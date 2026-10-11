'use client';

import { useState } from 'react';
import LetterHeadingEditor from './letter-heading-editor';
import { updateEmployeeOfferHeading } from './actions';

export default function OfferLetterModal({
  id,
  name,
  department,
  roleTitle,
  offerHeading,
}: {
  id: string;
  name: string;
  department: string;
  roleTitle: string;
  offerHeading?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-red-700 hover:underline dark:text-red-500">
        View offer letter
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <style>{`
            .jaad-letter-dialog { width: min(100%, 1000px); max-height: calc(100vh - 32px); display:flex; flex-direction:column; background:#f1f1f1; border-radius:12px; overflow:hidden; }
            .jaad-letter-scroll { overflow:auto; padding:24px; }
            .jaad-a4-sheet { width:210mm; min-height:297mm; box-sizing:border-box; margin:0 auto; padding:18mm; background:#fff; color:#171717; box-shadow:0 2px 14px #0002; font-size:11pt; line-height:1.55; }
            .jaad-a4-header { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #b91c1c; padding-bottom:12px; margin-bottom:28px; }
            @media screen and (max-width: 850px) { .jaad-a4-sheet { width:100%; min-height:0; padding:28px; } .jaad-letter-scroll { padding:12px; } }
            @page { size:A4 portrait; margin:0; }
            @media print {
              html, body { width:210mm !important; min-height:297mm !important; margin:0 !important; padding:0 !important; background:#fff !important; }
              body * { visibility:hidden !important; }
              .jaad-letter-print, .jaad-letter-print * { visibility:visible !important; }
              .jaad-letter-dialog { display:block !important; position:absolute !important; inset:0 auto auto 0 !important; width:210mm !important; max-height:none !important; overflow:visible !important; border:0 !important; border-radius:0 !important; background:#fff !important; }
              .jaad-letter-scroll { overflow:visible !important; padding:0 !important; }
              .jaad-a4-sheet { width:210mm !important; min-height:297mm !important; margin:0 !important; padding:18mm !important; box-shadow:none !important; }
              .jaad-letter-controls, .jaad-letter-modal-header { display:none !important; }
              * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
            }
          `}</style>
          <div className="jaad-letter-dialog">
            <div className="jaad-letter-modal-header flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">A4 offer letter preview · {name}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close preview" className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100">✕</button>
            </div>
            <div className="jaad-letter-scroll">
              <article className="jaad-a4-sheet jaad-letter-print">
                <header className="jaad-a4-header">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="JAAD Logistics" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18pt', fontWeight: 800, letterSpacing: '.04em' }}>OFFER LETTER</div>
                    <div style={{ fontSize: '9pt', color: '#666' }}>JAAD Logistics Ltd.</div>
                  </div>
                </header>
                <div style={{ color: '#666', marginBottom: '4px' }}>Lagos State, Nigeria</div>
                <div style={{ color: '#666', marginBottom: '22px' }}>admin@jaadlogistics.com.ng</div>
                <div style={{ color: '#666', marginBottom: '26px' }}>{today}</div>
                <p style={{ marginBottom: '16px' }}>Dear {name},</p>
                <div style={{ marginBottom: '16px' }}>
                  <LetterHeadingEditor
                    initialHtml={offerHeading ?? ''}
                    placeholder="e.g. Offer of Employment — Admin / Virtual Assistant"
                    onSave={(html) => updateEmployeeOfferHeading(id, html)}
                  />
                </div>
                <p style={{ marginBottom: '16px' }}>
                  We are pleased to offer you the position of <strong>{roleTitle}</strong> in the <strong>{department}</strong> department at JAAD Logistics Ltd. This letter confirms the terms of your engagement with us.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Your role will involve responsibilities consistent with the position of {roleTitle}, reporting to the relevant departmental head. Your employment is subject to JAAD Logistics&apos; internal policies, code of conduct, and applicable Nigerian labour law.
                </p>
                <p style={{ marginBottom: '34px' }}>
                  We look forward to your contribution to the team and to a long and mutually beneficial working relationship.
                </p>
                <p style={{ marginBottom: '28px' }}>Yours sincerely,</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/signature.jpg" alt="Signature" style={{ display: 'block', width: '100px', height: '42px', objectFit: 'contain', objectPosition: 'left bottom' }} />
                <div style={{ borderTop: '1px solid #999', width: '190px', paddingTop: '6px', fontSize: '9pt', color: '#666' }}>HR &amp; Careers<br />JAAD Logistics Ltd.</div>
              </article>
            </div>
            <div className="jaad-letter-controls flex justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-3">
              <button onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm">Close</button>
              <button onClick={() => window.print()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white">Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
