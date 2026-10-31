"use client";

import { useEffect, useState } from "react";

type Props = { title: string; href: string; className?: string };

const LEGAL_PAGES: Record<string, string[]> = {
  "/documents/JAAD-LOGISTICS-Privacy-Policy.pdf": ["privacy-policy-1", "privacy-policy-2", "privacy-policy-3", "privacy-policy-4"],
  "/documents/JAAD-LOGISTICS-Terms-of-Service.pdf": ["terms-of-service-1", "terms-of-service-2", "terms-of-service-3", "terms-of-service-4"],
  "/documents/JAAD-LOGISTICS-User-Agreement.pdf": ["user-agreement-1", "user-agreement-2"],
  "/documents/JAAD-LOGISTICS-Cookie-Policy.pdf": ["cookie-policy-1"],
  "/documents/JAAD-LOGISTICS-Customer-Protection.pdf": ["customer-protection-1", "customer-protection-2"],
  "/documents/JAAD-LOGISTICS-Data-Processing-Addendum.pdf": ["data-processing-addendum-1", "data-processing-addendum-2"],
};

export default function PolicyPdfLink({ title, href, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const pages = LEGAL_PAGES[href] ?? [];
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <>
    <button type="button" className={`jaad-policy-link jaad-policy-button ${className}`.trim()} style={{display:"inline",padding:0,margin:0,border:0,background:"transparent",color:"inherit",font:"inherit",cursor:"pointer",textDecoration:"underline"}} onClick={() => setOpen(true)}>{title}</button>
    {open && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,.82)",display:"flex",justifyContent:"center",alignItems:"center",padding:16}}>
      <section role="dialog" aria-modal="true" aria-label={title} style={{width:"min(760px,100%)",height:"min(88vh,950px)",background:"#fff",display:"flex",flexDirection:"column",overflow:"hidden",borderRadius:8,boxShadow:"0 16px 50px rgba(0,0,0,.5)"}}>
        <header style={{flexShrink:0,background:"#080808",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"12px 18px",minHeight:62}}>
          <div style={{display:"flex",alignItems:"center",gap:16,minWidth:0}}><img src="/jaad-logo.png" alt="JAAD Logistics" style={{width:86,height:38,objectFit:"contain"}} /><span style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close document" style={{border:"1px solid #666",borderRadius:"50%",background:"#222",color:"white",width:34,height:34,cursor:"pointer",fontSize:22,lineHeight:"30px",flexShrink:0}}>×</button>
        </header>
        <div style={{flex:1,overflowY:"auto",background:"#fff",padding:0}}>
          {pages.length ? pages.map((name,index) => <img key={name} src={`/legal-pages/${name}.webp`} alt={`${title} page ${index+1}`} loading={index===0?"eager":"lazy"} style={{display:"block",width:"100%",height:"auto",margin:0,background:"white"}} />) : <p style={{color:"#111",padding:20}}>Document not available.</p>}
        </div>
      </section>
    </div>}
  </>;
}
