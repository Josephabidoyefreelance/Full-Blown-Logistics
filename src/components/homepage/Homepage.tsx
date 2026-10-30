"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import PolicyPdfLink from "@/components/PolicyPdfLink";

const services = [
  { number: "01", title: "Haulage & freight", text: "Coordinate commercial cargo movement with clear communication from collection to destination.", icon: "↗", image: "/haulage-freight.jpg" },
  { number: "02", title: "Delivery coordination", text: "Organise dispatch, delivery handovers and customer updates around your daily operation.", icon: "⇢", image: "/delivery-coordination.jpg" },
  { number: "03", title: "Shipment visibility", text: "Give customers clearer updates and keep the people involved in a shipment aligned.", icon: "◎", image: "/shipment-visibility.jpg" },
  { number: "04", title: "Business logistics support", text: "Talk with JAAD about your routes, delivery requirements and operational needs.", icon: "＋", image: "/business-logistics-support.jpg" },
];

export default function Homepage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", company: "", topic: "Logistics services" });
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [agentRequested, setAgentRequested] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // UI hand-off only. Connect this submit to the project's approved enquiry API before production.
    setLeadSubmitted(true);
    setMessages(["JAAD: Thanks for contacting us. You can ask about shipments, delivery, returns, booking, billing or support. Type “agent” whenever you want a human support team member."]);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, `You: ${trimmed}`]);
    const lower = trimmed.toLowerCase();
    if (/(\bagent\b|human|speak to someone|representative|complaint)/.test(lower)) {
      setAgentRequested(true);
      setMessages((current) => [...current, "JAAD: I’ve marked this conversation for a human support team member. The live hand-off must be connected to the JAAD support inbox to notify an agent; please also use support@jaadlogistics.com or WhatsApp/Call 234-(707)-568-8573 for direct contact."]);
    } else if (!agentRequested) {
      const faq: [RegExp, string][] = [
        [/track|tracking|where.*package|shipment status/, "To check a shipment, provide your tracking number. Tracking updates may pause for 12–48 hours between sorting facilities; if there is no update after 48 hours, contact support for an investigation."],
        [/delivery time|how long|deliver.*take|express/, "Standard delivery typically takes 3–5 business days. Express delivery is next business day when booked before 3 PM local time. Same-day delivery is available in select cities; availability varies by area."],
        [/not home|missed delivery|delivery attempt/, "JAAD makes up to three delivery attempts. After the third attempt, a package is held at the nearest depot for 5 business days before it is returned to the sender."],
        [/damaged|damage|lost|not received/, "For a missing or damaged shipment, share your tracking number with support. For damage, take clear photos of the item and packaging and keep the original packaging while the claim is reviewed."],
        [/return|refund/, "Standard returns are accepted within 30 days of the original delivery date. Share your order number with support to arrange a return or collection."],
        [/book|booking|pickup|collection|new shipment/, "To arrange a shipment, provide pickup and delivery addresses, package dimensions and weight. You can contact JAAD to receive a quote and confirm booking."],
        [/invoice|billing|charged|payment/, "Invoices are available in your online account under billing. For a billing dispute, share your invoice number and describe the discrepancy so the billing team can review it."],
        [/international|customs|import duty|duty|tax/, "JAAD handles international shipments. Delivery times and rates depend on destination. Customs clearance can take 1–10 business days; share your tracking number for a shipment-specific update."],
        [/business account|company account|account/, "Business accounts may include volume pricing, consolidated monthly invoicing and a dedicated account manager. Share your company and contact details with the JAAD team to enquire."],
        [/support hours|opening hours|working hours/, "Chat support hours listed in the JAAD FAQ are Monday–Friday, 8 AM–8 PM, and Saturday, 9 AM–5 PM. Outside these hours, leave a message or email support@jaadlogistics.com."]
      ];
      const match = faq.find(([pattern]) => pattern.test(lower));
      setMessages((current) => [...current, `JAAD: ${match ? match[1] : "I can’t confidently answer that from the approved JAAD FAQ. Type “agent” to request human support, or email support@jaadlogistics.com / WhatsApp or call 234-(707)-568-8573."}`]);
    } else {
      setMessages((current) => [...current, "JAAD: This conversation is marked for human support, so automated replies are paused. Please wait for the support team or contact support@jaadlogistics.com / WhatsApp or call 234-(707)-568-8573."]);
    }
    setMessage("");
  }

  return (
    <main className="jaad-home">


      <header className="jaad-header">
        <nav className="jaad-wrap jaad-nav" aria-label="Main navigation">
          <a href="#top" className="jaad-logo-link" aria-label="JAAD home"><img className="jaad-logo" src="/jaad-logo.png" alt="JAAD logo" /></a>
          <button className="jaad-menu" type="button" onClick={() => document.querySelector('.jaad-navlinks')?.classList.toggle('open')} aria-label="Toggle navigation">Menu</button>
          <div className="jaad-navlinks">
            <a href="#services">Services</a><a href="#about">About Us</a><details className="jaad-products-menu"><summary>Products <span aria-hidden="true">▾</span></summary><div className="jaad-products-dropdown"><Link href="/erp">ERP &amp; CRM</Link></div></details>
          </div>
          <div className="jaad-nav-actions">
  <a className="jaad-nav-cta" href="#contact">Talk to our team</a>
</div>
        </nav>
      </header>

      {/* Design 9: JAAD's approved centered hero, black and red brand palette. */}
      <section className="jaad-hero jaad-hero-nine" id="top">
        <div className="jaad-nine-lights" aria-hidden="true"><i/><i/><i/><i/></div>
        <div className="jaad-wrap jaad-nine-centered">
          <h1>Dominating Global <span>Logistics</span><br/>with <em>Unmatched</em> <span>Control.</span></h1>
          <p className="jaad-hero-copy">From global freight to last-mile delivery, our logistics solutions are built for speed, precision, and reliability—so your business never stops moving.</p>
          <div className="jaad-actions"><a className="jaad-btn jaad-nine-primary" href="#contact">Get Started <span>↗</span></a><Link className="jaad-btn jaad-nine-outline" href="/erp">Explore JAAD ERP</Link></div>
          <div className="jaad-nine-preview" aria-label="JAAD logistics operations dashboard preview">
            <div className="jaad-nine-preview-top"><img className="jaad-nine-preview-logo" src="/jaad-logo.png" alt="JAAD Logistics" /><span>OPERATIONS OVERVIEW</span><span className="jaad-nine-preview-live">● LIVE WORKSPACE</span></div>
            <div className="jaad-nine-preview-grid">
              <div className="jaad-nine-preview-sidebar"><strong>Dashboard</strong><span>Shipments</span><span>Customers</span><span>Fleet</span><span>Warehouse</span><span>Reports</span></div>
              <div className="jaad-nine-preview-main"><div className="jaad-nine-preview-heading"><strong>Logistics at a glance</strong><small>Visibility across every operation</small></div><div className="jaad-nine-preview-stats"><div><small>SHIPMENTS</small><b>TRACK</b></div><div><small>DELIVERIES</small><b>MANAGE</b></div><div><small>OPERATIONS</small><b>CONTROL</b></div></div><div className="jaad-nine-preview-map"><span>GLOBAL OPERATIONS</span><svg viewBox="0 0 580 130" aria-hidden="true"><path d="M0 105 Q95 25 174 77 T345 42 T580 65"/><path d="M0 122 Q130 82 236 109 T580 19"/><circle cx="174" cy="77" r="5"/><circle cx="345" cy="42" r="5"/><circle cx="505" cy="56" r="5"/></svg></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="jaad-section" id="services"><div className="jaad-wrap"><div className="jaad-section-heading"><div><p className="jaad-kicker">Our services</p><h2>Logistics solutions for the movement of your business.</h2></div></div><div className="jaad-services">{services.map((service) => <article className="jaad-service" key={service.number}><div className="jaad-service-art"><img src={service.image} alt={service.title} loading="lazy"/><span style={{position:"absolute",right:12,bottom:8,color:"white",textShadow:"0 1px 4px #000"}}>{service.icon}</span></div><div className="jaad-service-body"><span className="jaad-service-num">{service.number} / SERVICE</span><h3>{service.title}</h3><p>{service.text}</p><a className="jaad-text-link" href="#contact">Discuss this service <span>→</span></a></div></article>)}</div></div></section>

      <section className="jaad-section jaad-about" id="about"><div className="jaad-wrap jaad-about-grid"><div><p className="jaad-kicker">About Us</p><h2>Reliable movement starts with clear communication.</h2><p>JAAD Logistics is a logistics business. We help customers coordinate the movement of goods and support the conversations and workflows that keep deliveries moving. We also offer business software as a separate product for companies that want more control over their operations.</p><a className="jaad-btn jaad-btn-red" href="#contact">Contact JAAD <span>→</span></a></div><div className="jaad-about-list"><div className="jaad-about-item"><span>↗</span><h3>Practical coordination</h3><p>Support for the real work behind collection, movement and delivery.</p></div><div className="jaad-about-item"><span>◎</span><h3>Clear updates</h3><p>Communication that helps customers and teams stay informed.</p></div><div className="jaad-about-item"><span>⇄</span><h3>Business relationships</h3><p>Responsive conversations about service needs and expectations.</p></div><div className="jaad-about-item"><span>＋</span><h3>Technology when needed</h3><p>ERP and CRM tools available separately for businesses to subscribe to.</p></div></div></div></section>

      <section className="jaad-faq" id="faq"><div className="jaad-wrap"><div className="jaad-section-heading"><div><p className="jaad-kicker">Frequently asked questions</p><h2>FAQs — Answers for your shipment.</h2></div></div><div className="jaad-faq-list">{[
        ["How do I track my shipment?", "Provide your tracking number to check the latest status and location. Tracking can pause for 12–48 hours between sorting facilities; if there is no update after 48 hours, contact support."],
        ["How long does delivery take?", "Standard delivery typically takes 3–5 business days. Express delivery arrives the next business day when booked before 3 PM local time. Same-day service is available in select cities."],
        ["What if my package is lost or damaged?", "Share your tracking number with support. For damage, take clear photos of the item and packaging, and keep the original packaging until the claim is resolved."],
        ["How do I arrange a shipment or pickup?", "Share the pickup and delivery addresses, package dimensions and weight with the JAAD team to receive a quote and confirm booking."],
        ["How can I speak to a human agent?", "Type “agent” in the chat, email support@jaadlogistics.com, or WhatsApp/call 234-(707)-568-8573. The live agent hand-off needs the approved backend inbox integration to notify staff."],
        ["Where can I read JAAD's policies?", "Open the Privacy Policy or Terms of Service below. They open as PDFs in a separate browser tab."]
      ].map(([q,a],i)=><div className="jaad-faq-item" key={q}><button className="jaad-faq-question" type="button" aria-expanded={faqOpen===i} onClick={()=>setFaqOpen(faqOpen===i?null:i)}><span>{q}</span><span>{faqOpen===i?"−":"+"}</span></button>{faqOpen===i&&<div className="jaad-faq-answer">{a}{i===5&&<div className="jaad-document-links"><a href="/documents/JAAD-LOGISTICS-Privacy-Policy.pdf" target="_blank" rel="noreferrer">Privacy Policy PDF ↗</a><a href="/documents/JAAD-LOGISTICS-Terms-of-Service.pdf" target="_blank" rel="noreferrer">Terms of Service PDF ↗</a></div>}</div>}</div>)}</div></div></section>

      <section className="jaad-erp-band"><div className="jaad-wrap"><div className="jaad-erp-panel"><div className="jaad-erp-copy"><p className="jaad-kicker">A separate JAAD product</p><h2>Meet JAAD ERP &amp; CRM.</h2><p>Manage shipments, customers, fleet, warehouse, finance, HR and day-to-day workflows in one business platform. Explore the software, see how subscriptions work, and choose whether it fits your company.</p></div><Link className="jaad-btn jaad-btn-red" href="/erp">Explore ERP &amp; CRM <span>→</span></Link></div></div></section>

      <section className="jaad-contact-strip" id="contact"><div className="jaad-wrap jaad-contact-inner"><div><p className="jaad-kicker">Let's talk logistics</p><h2>What do you need to move?</h2><p>Contact our team to discuss freight, delivery coordination, shipment communication or your business logistics requirements.</p></div><div className="jaad-actions"><a className="jaad-btn jaad-btn-red" href="mailto:support@jaadlogistics.com">Email JAAD <span>→</span></a><a className="jaad-btn jaad-btn-outline" href="https://wa.me/2347075688573" target="_blank" rel="noreferrer">WhatsApp</a></div></div></section>

      <footer className="jaad-footer"><div className="jaad-wrap"><div className="jaad-footer-grid"><div className="jaad-footer-about"><img className="jaad-footer-brand" src="/jaad-logo.png" alt="JAAD logo"/><p>Logistics services for businesses that need goods moved, deliveries coordinated and customers kept informed.</p><div className="jaad-footer-contact"><a href="mailto:support@jaadlogistics.com" aria-label="Email JAAD"><img className="jaad-contact-logo" src="/email.png" alt="" aria-hidden="true"/><span>support@jaadlogistics.com</span></a><a href="https://wa.me/2347075688573" target="_blank" rel="noreferrer" aria-label="WhatsApp JAAD"><img className="jaad-contact-logo" src="/whatsapp.png" alt="" aria-hidden="true"/><span>WhatsApp</span></a><a href="https://www.instagram.com/jaadlogistics/" target="_blank" rel="noreferrer" aria-label="Instagram"><img className="jaad-contact-logo" src="/instagram.png" alt="" aria-hidden="true"/><span>Instagram</span></a><a href="tel:+2347075688573" aria-label="Call JAAD"><span className="jaad-contact-icon jaad-phone-icon" aria-hidden="true">☎</span><span>234-(707)-568-8573</span></a></div></div><div><h3>LOGISTICS</h3><ul><li><a href="#services">Haulage &amp; freight</a></li><li><a href="#services">Delivery coordination</a></li><li><a href="#services">Shipment visibility</a></li><li><a href="#contact">Discuss a service</a></li></ul></div><div><h3>BUSINESS SOFTWARE</h3><ul><li><Link href="/erp">ERP &amp; CRM overview</Link></li><li><Link href="/customer/signup">Create customer account</Link></li><li><a href="mailto:support@jaadlogistics.com">Product enquiries</a></li></ul></div><div><h3>COMPANY</h3><ul><li><a href="#about">About Us</a></li><li><a href="/careers">Careers</a></li><li><Link className="jaad-admin-access" href="/admin/login" aria-label="Admin login" title="Admin login"><span aria-hidden="true">•</span></Link></li></ul></div></div><div className="jaad-footer-bottom"><span>© 2026 JAAD Logistics. All rights reserved.</span><div className="jaad-footer-legal"><PolicyPdfLink title="Privacy policy" href="/documents/JAAD-LOGISTICS-Privacy-Policy.pdf" /><PolicyPdfLink title="Terms & conditions" href="/documents/JAAD-LOGISTICS-Terms-of-Service.pdf" /><PolicyPdfLink title="User agreement" href="/documents/JAAD-LOGISTICS-User-Agreement.pdf" /><PolicyPdfLink title="Cookie policy" href="/documents/JAAD-LOGISTICS-Cookie-Policy.pdf" /><PolicyPdfLink title="Customer protection" href="/documents/JAAD-LOGISTICS-Customer-Protection.pdf" /><PolicyPdfLink title="Data processing addendum" href="/documents/JAAD-LOGISTICS-Data-Processing-Addendum.pdf" /></div></div></div></footer>

      {chatOpen && <section className="jaad-chat-window" aria-label="JAAD contact chat"><div className="jaad-chat-head"><img src="/jaad-logo.png" alt="JAAD"/><button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat">×</button></div>{!leadSubmitted ? <div className="jaad-chat-content"><h3>How can we help?</h3><p>Share your details first so the JAAD team can identify your enquiry.</p><form className="jaad-chat-form" onSubmit={submitLead}><label>Full name<input required value={lead.name} onChange={(e) => setLead({...lead,name:e.target.value})} placeholder="Your full name"/></label><label>Work email<input required type="email" value={lead.email} onChange={(e) => setLead({...lead,email:e.target.value})} placeholder="you@company.com"/></label><label>Company name<input required value={lead.company} onChange={(e) => setLead({...lead,company:e.target.value})} placeholder="Your business"/></label><label>What is your enquiry about?<select value={lead.topic} onChange={(e) => setLead({...lead,topic:e.target.value})}><option>Logistics services</option><option>JAAD ERP & CRM</option><option>Existing customer support</option><option>Other enquiry</option></select></label><button type="submit">Continue to message</button></form></div> : <><div className="jaad-chat-content"><div className="jaad-chat-bubble">Thanks, {lead.name}. Your details are ready. Type your message below.</div><div className="jaad-chat-bubble"><strong>Enquiry:</strong> {lead.topic}<br/><strong>Company:</strong> {lead.company}<br/><strong>Email:</strong> {lead.email}</div>{agentRequested&&<div className="jaad-chat-status">Human support requested. Automated answers are paused for this conversation.</div>}{messages.map((item,index)=><div className="jaad-chat-bubble" key={`${index}-${item}`}>{item}</div>)}</div><form className="jaad-chat-send" onSubmit={sendMessage}><input aria-label="Type a message" value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Type your message…"/><button type="submit">Send</button></form></>}</section>}
      <button className="jaad-chat-launch" type="button" onClick={() => setChatOpen((open) => !open)} aria-label="Open JAAD chat"><img src="/jaad-logo.png" alt=""/></button>
    </main>
  );
}
