"use client";

import { useEffect, useState } from "react";

type Props = { title: string; href: string; className?: string };

const LEGAL_PAGES: Record<string, string[]> = {"/documents/JAAD-LOGISTICS-Privacy-Policy.pdf": ["/legal-pages/privacy-policy-1.webp", "/legal-pages/privacy-policy-2.webp", "/legal-pages/privacy-policy-3.webp", "/legal-pages/privacy-policy-4.webp"], "/documents/JAAD-LOGISTICS-Terms-of-Service.pdf": ["/legal-pages/terms-of-service-1.webp", "/legal-pages/terms-of-service-2.webp", "/legal-pages/terms-of-service-3.webp", "/legal-pages/terms-of-service-4.webp"], "/documents/JAAD-LOGISTICS-User-Agreement.pdf": ["/legal-pages/user-agreement-1.webp", "/legal-pages/user-agreement-2.webp"], "/documents/JAAD-LOGISTICS-Cookie-Policy.pdf": ["/legal-pages/cookie-policy-1.webp"], "/documents/JAAD-LOGISTICS-Customer-Protection.pdf": ["/legal-pages/customer-protection-1.webp", "/legal-pages/customer-protection-2.webp"], "/documents/JAAD-LOGISTICS-Data-Processing-Addendum.pdf": ["/legal-pages/data-processing-addendum-1.webp", "/legal-pages/data-processing-addendum-2.webp"]};

export default function PolicyPdfLink({ title, href, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const pages = LEGAL_PAGES[href] ?? [];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" className={`jaad-policy-link jaad-policy-button ${className}`.trim()} onClick={() => setOpen(true)}>{title}</button>
      {open && (
        <div className="jaad-pdf-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="jaad-pdf-modal jaad-legal-readonly" role="dialog" aria-modal="true" aria-label={title}>
            <header className="jaad-legal-header">
              <button type="button" className="jaad-legal-close" aria-label="Close document" onClick={() => setOpen(false)}>×</button>
              <img className="jaad-legal-header-logo" src="/jaad-logo.png" alt="JAAD Logistics" />
            </header>
            <div className="jaad-legal-pages">
              {pages.map((src, index) => (
                <div className="jaad-legal-page" key={src}>
                  <img className="jaad-legal-page-image" src={src} alt={`${title}, page ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
