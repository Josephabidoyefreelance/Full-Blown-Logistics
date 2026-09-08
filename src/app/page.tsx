"use client";

import { useState, Fragment } from "react";
import Link from "next/link";

const ADMIN_LOGIN_URL = "/admin/login";
const CUSTOMER_LOGIN_URL = "/customer/login";
const CUSTOMER_SIGNUP_URL = "/customer/signup";
const WHATSAPP_URL = "https://wa.me/2347075688573";

const LOGO_URL = "/logo.png";

const LEGAL_DOCS = {"cookie-policy": {"title": "Cookie Policy", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. What Cookies Are"}, {"type": "p", "text": "Cookies and similar technologies are small files or identifiers stored on or associated with a browser or device. JAAD LOGISTICS may use them to operate the website, maintain sessions, remember preferences, understand usage and improve security."}, {"type": "h", "text": "2. Cookie Categories"}, {"type": "p", "text": "Strictly necessary: login, session management, authentication, security and core website functions."}, {"type": "p", "text": "Preferences: language, interface or other settings where used."}, {"type": "p", "text": "Analytics: aggregate information about website performance and usage, where permitted."}, {"type": "p", "text": "Marketing/advertising: only where used and where legally permitted, with consent where required."}, {"type": "h", "text": "3. Your Choices"}, {"type": "p", "text": "You can control cookies through browser settings and, where provided, JAAD LOGISTICS cookie preference tool. Blocking essential cookies may prevent login or core services from functioning."}, {"type": "h", "text": "4. Third Parties"}, {"type": "p", "text": "Third-party services integrated into the website may set their own cookies or similar identifiers. JAAD LOGISTICS will disclose material categories of such providers where required."}, {"type": "h", "text": "5. Updates"}, {"type": "p", "text": "JAAD LOGISTICS may update this Cookie Policy as technologies and legal requirements change."}]}, "privacy-policy": {"title": "Privacy Policy", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. Purpose and Scope"}, {"type": "p", "text": "JAAD LOGISTICS (“JAAD”, “we”, “us” or “our”) respects the privacy of customers, visitors, users, merchants, business clients, delivery recipients, drivers/couriers, employees and other individuals whose personal data comes into our custody. This Privacy Policy explains what information we collect, why we collect it, how we use it, when we disclose it, how we secure it, how long we keep it, and the rights available to individuals."}, {"type": "p", "text": "This Policy applies to the JAAD LOGISTICS website, customer portal, ERP/management features, order and delivery workflows, forms, communications and other related digital services (collectively, the “Services”)."}, {"type": "h", "text": "2. Our Identity"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\nRegistered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\nNature of business: Logistics Service"}, {"type": "p", "text": "JAAD LOGISTICS is registered as a business name with the Corporate Affairs Commission of Nigeria and also trade marked with the Trademark Registry / Intellectual Property Office (IPO) Nigeria. The registration certificate supplied for this drafting identifies the business as JAAD LOGISTICS BN 2710259, with the nature of business stated as “LOGISTICS SERVICE” and the principal place of business at 64A Olushi Street, Lagos Island, Lagos. The certificate is dated 4 December 2018."}, {"type": "h", "text": "3. Information We Collect"}, {"type": "p", "text": "We may collect information you provide directly, information generated through your use of the Services, and information received from customers, business clients, delivery partners, payment providers and other lawful sources."}, {"type": "h", "text": "4. Categories of Personal Data"}, {"type": "p", "text": "Account data: username, full name, email address, telephone number, password credentials, profile information and account preferences."}, {"type": "p", "text": "Identity and contact data: name, business name, billing/delivery address, pickup and destination addresses, contact persons and other information needed to identify or reach you."}, {"type": "p", "text": "Order and logistics data: shipment/order numbers, package descriptions, delivery instructions, pickup/delivery details, recipient information, status updates, proof-of-delivery information, complaints and claims."}, {"type": "p", "text": "Transaction data: payment status, amount, currency, invoice/reference number, payment method and transaction identifiers. Where a third-party payment processor is used, JAAD will generally receive only the information necessary to confirm and reconcile the transaction, subject to the processor’s own privacy terms."}, {"type": "p", "text": "Technical data: IP address, device/browser information, operating system, approximate location derived from technical data, access logs, pages or features used, timestamps, cookies and similar technologies."}, {"type": "p", "text": "Communications data: messages, support requests, feedback, call records where lawfully recorded, and correspondence with JAAD LOGISTICS"}, {"type": "p", "text": "Business/ERP data: where a business customer uses our ERP tools, that customer may upload or otherwise process information relating to its own staff, customers, suppliers, orders, inventory, invoices and other business records. The business customer may remain the controller of such data, while JAAD LOGISTICS may act as a processor/service provider depending on the arrangement."}, {"type": "h", "text": "5. How We Collect Information"}, {"type": "p", "text": "We collect information when you create an account, request a quote, place or manage an order, make or attempt a payment, contact support, use the customer dashboard, use ERP features, submit a form, communicate with us, or interact with our website and cookies."}, {"type": "h", "text": "6. Why We Use Personal Data"}, {"type": "p", "text": "To create and administer accounts and authenticate users."}, {"type": "p", "text": "To provide logistics, delivery, tracking, customer support and ERP services."}, {"type": "p", "text": "To process orders, quotations, invoices, payments, refunds and claims."}, {"type": "p", "text": "To communicate service updates, delivery notifications, account notices and security alerts."}, {"type": "p", "text": "To prevent fraud, misuse, unauthorized access and other unlawful activity."}, {"type": "p", "text": "To maintain service reliability, security, troubleshooting and audit records."}, {"type": "p", "text": "To improve our website, products, workflows and customer experience."}, {"type": "p", "text": "To comply with legal, regulatory, tax, accounting, court or law-enforcement requirements."}, {"type": "p", "text": "To send marketing communications where permitted and, where required, after obtaining appropriate consent. You may opt out of marketing communications."}, {"type": "h", "text": "7. Lawful Bases"}, {"type": "p", "text": "Depending on the circumstances, JAAD LOGISTICS may rely on performance of a contract, compliance with legal obligations, consent, protection of vital interests, public interest where legally available, or legitimate interests where permitted by applicable law and balanced against the rights and interests of the data subject."}, {"type": "p", "text": "Where consent is the lawful basis, you may withdraw consent, but withdrawal does not affect processing already carried out lawfully before withdrawal and may not be possible where another lawful basis applies."}, {"type": "h", "text": "8. Data Sharing and Disclosure"}, {"type": "p", "text": "We do not sell personal information as a general business practice. We may disclose information to logistics/delivery partners, payment processors, hosting and cloud providers, IT/security providers, analytics providers, professional advisers, insurers, auditors, regulators, courts, law-enforcement authorities and other service providers where necessary, lawful and proportionate."}, {"type": "p", "text": "We require appropriate contractual, confidentiality and security protections from service providers that process personal data on our behalf, subject to applicable law."}, {"type": "p", "text": "We may disclose information in connection with a merger, acquisition, restructuring, financing, sale of assets or similar corporate transaction, subject to applicable confidentiality and privacy requirements."}, {"type": "h", "text": "9. International Transfers"}, {"type": "p", "text": "Some technology, cloud, payment, analytics or support providers may process information outside Nigeria. Where applicable law requires safeguards for international transfers, JAAD LOGISTICS will use appropriate safeguards and contractual or other legally recognized mechanisms."}, {"type": "h", "text": "10. Security"}, {"type": "p", "text": "JAAD LOGISTICS, uses reasonable administrative, technical and organizational safeguards appropriate to the nature of the data and the risks involved. Measures may include access controls, authentication, role-based permissions, encryption where appropriate, logging, backups, secure development practices, vulnerability management and staff confidentiality obligations."}, {"type": "p", "text": "No internet service can be guaranteed to be completely secure. Users must protect their passwords, authentication codes and devices and promptly notify JAAD LOGISTICS of suspected account compromise."}, {"type": "h", "text": "11. Data Retention"}, {"type": "p", "text": "We retain personal data only for as long as reasonably necessary for the purpose for which it was collected, to provide Services, resolve disputes, enforce agreements, prevent fraud, maintain accounting and tax records, and comply with legal obligations. Different categories may have different retention periods."}, {"type": "p", "text": "Where a specific retention period is required for a record, JAAD LOGISTICS will apply that period. Otherwise, data will be securely deleted, anonymized or de-identified when no longer required."}, {"type": "h", "text": "12. Cookies and Similar Technologies"}, {"type": "p", "text": "We may use essential cookies for login, security and session management, and optional analytics or preference cookies where permitted. See the separate JAAD LOGISTICS Cookie Policy for details and available choices."}, {"type": "h", "text": "13. Your Privacy Rights"}, {"type": "p", "text": "Subject to applicable law and lawful exceptions, you may have rights to be informed, access personal data, correct inaccurate data, object to certain processing, restrict processing, request deletion/erasure, request portability, withdraw consent, and challenge certain automated decisions. The exact rights depend on the law that applies to you."}, {"type": "p", "text": "To exercise a right, contact privacy@jaadlogistics.com We may need to verify identity before completing a request. We will not discriminate against a person for exercising a lawful privacy right."}, {"type": "h", "text": "14. Nigeria Data Protection Framework"}, {"type": "p", "text": "JAAD LOGISTICS intends this Policy to operate consistently with the Nigeria Data Protection Act 2023 and applicable guidance issued by the Nigeria Data Protection Commission (NDPC). The NDPC identifies rights including being informed, access, rectification, objection, restriction, portability, erasure, complaint to the supervisory authority and rights relating to automated decision-making."}, {"type": "p", "text": "Where a personal-data breach is likely to result in a risk to individuals’ rights and freedoms, applicable Nigerian requirements include notification to the NDPC within the legally prescribed period; JAAD LOGISTICS will maintain an incident-response process designed to meet those requirements."}, {"type": "h", "text": "15. Children"}, {"type": "p", "text": "The Services are intended for adults and business users. We do not knowingly design the Services to collect personal data from children without an appropriate lawful basis and safeguards. If you believe a child has provided personal data improperly, contact us so we can investigate."}, {"type": "h", "text": "16. Third-Party Links"}, {"type": "p", "text": "Our website may contain links to third-party websites or services. JAAD LOGISTICS is not responsible for the privacy practices of third parties. Review their privacy notices before providing personal information."}, {"type": "h", "text": "17. Changes to this Policy"}, {"type": "p", "text": "We may update this Policy from time to time. The latest version will be posted on the website with its effective date. Material changes will be communicated where required by law."}, {"type": "p", "text": "18. Contact\nWebsite: www.jaadlogistics.com\nGeneral customer support email: support@jaadlogistics.com\nPrivacy/Data Protection email: privacy@jaadlogistics.com\nPhone/WhatsApp: +2348061472153\nClaims/refunds email: claims@jaadlogistics.com"}]}, "terms-of-use": {"title": "Terms of Use", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. Acceptance"}, {"type": "p", "text": "These Terms of Use (“Terms”) govern access to and use of the JAAD LOGISTICS"}, {"type": "p", "text": "website, customer portal, ERP features and related Services. By accessing the Services, creating an account, placing an order, purchasing a package, or otherwise using the Services, you agree to these Terms and any service-specific terms presented at checkout or in an order confirmation."}, {"type": "h", "text": "2. Eligibility and Authority"}, {"type": "p", "text": "You must be legally capable of entering a binding agreement. If you use the Services for a company or other organization, you represent that you have authority to bind that organization."}, {"type": "h", "text": "3. Accounts"}, {"type": "p", "text": "You must provide accurate and current registration information. You are responsible for maintaining the confidentiality of your login credentials and for activity conducted through your account, except to the extent caused by JAAD LOGISTICS failure to maintain required security."}, {"type": "p", "text": "Do not share credentials, impersonate another person, create fraudulent accounts, or attempt to gain unauthorized access to another user’s account."}, {"type": "h", "text": "4. Logistics Services"}, {"type": "p", "text": "Services may include pickup, transportation, delivery, tracking, fulfillment, shipment management and related services. Availability, routes, delivery times, prices and service levels may vary by location, package type, traffic, weather, operational capacity and other circumstances."}, {"type": "p", "text": "Delivery estimates are estimates unless JAAD LOGISTICS expressly guarantees a delivery window in writing."}, {"type": "h", "text": "5. Orders, Quotes and Payments"}, {"type": "p", "text": "An order is subject to acceptance and operational availability. Prices, fees, taxes and applicable surcharges will be displayed or otherwise communicated before the transaction where required."}, {"type": "p", "text": "Customers authorize JAAD LOGISTICS or its designated payment provider to process payments for valid charges. Customers must not use fraudulent payment methods or attempt unauthorized chargebacks."}, {"type": "p", "text": "Where a payment is made directly into a JAAD LOGISTICS designated bank account, the customer should retain proof of payment and use the correct reference. JAAD LOGISTICS may require verification before activating a package or service."}, {"type": "h", "text": "6. Prohibited Items and Activities"}, {"type": "p", "text": "Customers must not use JAAD LOGISTICS to transport, store or facilitate unlawful, dangerous, stolen, counterfeit or prohibited goods, or goods restricted by applicable law or the agreed service. Customers must accurately declare shipment contents where required."}, {"type": "p", "text": "JAAD LOGISTICS may refuse, inspect, suspend or cancel a shipment where reasonably necessary for safety, compliance, fraud prevention or operational reasons, subject to applicable law."}, {"type": "h", "text": "7. Customer Responsibilities"}, {"type": "p", "text": "Provide accurate sender/recipient information, addresses, contact numbers, package descriptions, weights/dimensions where requested, delivery instructions and any required documentation."}, {"type": "p", "text": "Package goods appropriately and disclose fragile, valuable, hazardous or regulated contents where required."}, {"type": "p", "text": "Ensure that the sender and recipient are available or that valid delivery instructions are provided."}, {"type": "p", "text": "Do not use the platform to upload unlawful, infringing, abusive, malicious or misleading content."}, {"type": "h", "text": "8. Delivery, Failed Delivery and Returns"}, {"type": "p", "text": "A delivery may be delayed or returned because of an incorrect address, recipient unavailability, refusal, access restrictions, security conditions, weather, traffic, force majeure, customs/regulatory issues or other circumstances beyond reasonable control."}, {"type": "p", "text": "Applicable redelivery, storage, return or additional-trip charges may apply where disclosed or permitted by the applicable service terms."}, {"type": "h", "text": "9. Claims, Loss and Damage"}, {"type": "p", "text": "Claims for loss, shortage or damage should be submitted through any of the official channels of communication within 48 hours after delivery or the expected delivery date, together with reasonable evidence."}, {"type": "p", "text": "Liability for a shipment may be subject to declared value, applicable service terms, exclusions and any mandatory legal rights. Nothing in these Terms excludes liability that cannot lawfully be excluded."}, {"type": "h", "text": "10. Refunds and Cancellation"}, {"type": "p", "text": "Refund eligibility depends on the service purchased, order status and applicable law. Where a cancellation or refund policy applies, it will be shown at checkout, in the package terms or in the customer agreement."}, {"type": "p", "text": "All refunds are automatically processed and you would get feed back through any of the official channel of communications."}, {"type": "h", "text": "11. ERP and Business Accounts"}, {"type": "p", "text": "Where JAAD LOGISTICS provides ERP tools to a business customer, the customer remains responsible for the accuracy, legality and authority of data it uploads. The customer must ensure it has a lawful basis and all required notices/permissions to process personal data through the platform."}, {"type": "p", "text": "JAAD LOGISTICS may process business-customer data to provide, secure, maintain and improve the platform and to comply with law, subject to the Privacy Policy and, where appropriate, a Data Processing Addendum."}, {"type": "h", "text": "12. Intellectual Property"}, {"type": "p", "text": "The JAAD LOGISTICS name, logo, website design, software, text, graphics, databases and other JAAD LOGISTICS materials are owned by or licensed to JAAD LOGISTICS and shall not be copied, modified, distributed or exploited without permission, except as permitted by law."}, {"type": "p", "text": "The JAAD logo supplied for this policy pack uses JAAD LOGISTICS red, white and black visual identity."}, {"type": "h", "text": "13. Acceptable Use"}, {"type": "p", "text": "Users must and shall not reverse engineer, scrape, overload, probe, disrupt, introduce malware, bypass security, access non-public systems, or use the Services to facilitate fraud or unlawful activity."}, {"type": "p", "text": "JAAD LOGISTICS may suspend or terminate accounts where reasonably necessary to protect users, the platform, third parties or legal compliance."}, {"type": "h", "text": "14. Availability and Third-Party Services"}, {"type": "p", "text": "JAAD LOGISTICS may modify, suspend or discontinue features. Third-party payment, mapping, communications, hosting or other integrations may have their own terms and availability limits."}, {"type": "h", "text": "15. Disclaimers"}, {"type": "p", "text": "Except where expressly stated or required by law, this Services are provided on an availability basis and JAAD LOGISTICS does not guarantee uninterrupted operation, error-free content, exact delivery times, or uninterrupted access to third-party systems."}, {"type": "h", "text": "16. LIMITATION OF LIABILITY"}, {"type": "p", "text": "To the maximum extent permitted by applicable law, JAAD LOGISTICS shall not be liable for indirect, incidental, special or consequential losses, loss of profits, loss of business, loss of goodwill or business interruption arising from or in connection with the Services."}, {"type": "p", "text": "Subject to applicable law, JAAD LOGISTICS aggregate liability arising out of or relating to a particular shipment, order or Service shall not exceed the total amount actually paid by the Customer to JAAD LOGISTICS for the specific shipment, order or Service giving rise to the claim."}, {"type": "p", "text": "Where a Customer declares a higher shipment value or purchases additional insurance or enhanced protection offered by JAAD LOGISTICS The  liability shall be determined in accordance with the applicable declared-value, insurance or enhanced-protection terms communicated to the Customer."}, {"type": "p", "text": "Nothing in these Terms shall exclude, restrict or limit any liability, right or remedy that cannot lawfully be excluded, restricted or limited under applicable Nigerian law, including applicable consumer-protection legislation."}, {"type": "p", "text": "Any limitation of liability contained in these Terms shall be brought to the Customer's attention before the relevant transaction is concluded, where required by applicable law."}, {"type": "h", "text": "17. Indemnity"}, {"type": "p", "text": "To the extent permitted by law, a user agrees to indemnify JAAD LOGISTICS for losses, claims and reasonable costs arising from the user’s unlawful use of the Services, breach of these Terms, fraudulent activity, or violation of third-party rights, except to the extent caused by JAAD LOGISTICS own unlawful conduct or negligence."}, {"type": "h", "text": "18. Suspension and Termination"}, {"type": "p", "text": "JAAD LOGISTICS may suspend or terminate access for material breach, fraud, non-payment, security risk, unlawful use, or where required by law. Users may request closure of their account, subject to outstanding obligations and lawful retention requirements."}, {"type": "h", "text": "19. GOVERNING LAW AND DISPUTE RESOLUTION"}, {"type": "h", "text": "19.1 Governing Law"}, {"type": "p", "text": "These Terms, the use of the JAAD LOGISTICS website, app and any other services provided by JAAD LOGISTICS shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, subject to any mandatory consumer-protection, data-protection or other statutory rights applicable to the Customer."}, {"type": "h", "text": "19.2 Customer Complaints and Internal Resolution"}, {"type": "p", "text": "If a customer has a complaint, dispute or concern relating to the Services, the Customer should first contact JAAD LOGISTICS through:"}, {"type": "p", "text": "Email: info@jaadlogistics.com    Privacy matters: privacy@jaadlogistics.com"}, {"type": "p", "text": "JAAD LOGISTICS will make reasonable efforts to acknowledge and investigate the complaint and, where appropriate, resolve it through good-faith communication, negotiation or another appropriate internal resolution process."}, {"type": "p", "text": "Customers should provide their name, order or transaction reference, relevant dates, details of the complaint and the remedy sought, together with any supporting documents reasonably available."}, {"type": "h", "text": "19.3 Escalation"}, {"type": "p", "text": "Where a dispute cannot be resolved through JAAD LOGISTICS internal complaint process, the parties may, where appropriate, attempt to resolve the matter through mediation or another mutually agreed alternative dispute-resolution process before commencing formal proceedings."}, {"type": "p", "text": "Nothing in this section prevents a Customer from exercising any statutory right to seek assistance or redress from a competent regulatory authority, including the Federal Competition and Consumer Protection Commission (FCCPC), where applicable. The FCCPA expressly permits consumers to approach the undertaking, the applicable sector regulator or the FCCPC, and also preserves the consumer's right to approach a court with appropriate jurisdiction."}, {"type": "h", "text": "19.4 Court Proceedings"}, {"type": "p", "text": "Where a dispute remains unresolved and formal legal proceedings are permitted or required, the dispute may be brought before a court of competent jurisdiction in Nigeria. Nothing in these Terms shall prevent a Customer from bringing a claim before a court or competent regulatory authority where such right cannot lawfully be restricted."}, {"type": "h", "text": "19.5 Mandatory Rights Preserved"}, {"type": "p", "text": "Nothing in these Terms is intended to exclude, restrict or waive any right, remedy, procedure or protection that cannot lawfully be excluded, restricted or waived under applicable Nigerian law."}, {"type": "h", "text": "19.6 Alternative Dispute Resolution / No Waiver"}, {"type": "p", "text": "Where the parties expressly agree in writing to mediation or arbitration, such process shall be conducted in accordance with the applicable agreement and applicable Nigerian law, including the Arbitration and Mediation Act 2023, where applicable."}, {"type": "p", "text": "A delay or failure by JAAD LOGISTICS to immediately enforce any provision of these Terms shall not constitute a waiver of JAAD LOGISTICS right to enforce that provision later."}, {"type": "h", "text": "20. Changes"}, {"type": "p", "text": "JAAD LOGISTICS may update these Terms of continued use after an effective date constitutes acceptance of the updated Terms to the extent permitted by law."}]}, "user-agreement": {"title": "User Agreement", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. Customer Agreement"}, {"type": "p", "text": "This User Agreement is the customer-facing contract for use of JAAD LOGISTICS services and customer accounts. It should be presented during registration and/or checkout with an affirmative acceptance mechanism where required."}, {"type": "p", "text": "By clicking “I Agree”, creating an account, purchasing a package, or using a JAAD LOGISTICS service after being presented with these terms, you acknowledge and accept this Agreement."}, {"type": "h", "text": "2. Service Relationship"}, {"type": "p", "text": "JAAD LOGISTICS provides logistics and related digital/ERP services. A specific order, package subscription, quote or service schedule may contain additional terms. If a specific service term conflicts with this Agreement, the specific service term controls only for that transaction."}, {"type": "h", "text": "3. User Commitments"}, {"type": "p", "text": "Use truthful information; maintain account security; pay valid charges; comply with shipping restrictions; provide accurate delivery details; and cooperate reasonably with delivery and verification processes."}, {"type": "h", "text": "4. Customer Data"}, {"type": "p", "text": "JAAD LOGISTICS will handle personal data according to its Privacy Policy. Business customers that upload third-party personal data are responsible for having the required legal authority to do so and for providing required privacy notices."}, {"type": "h", "text": "5. Digital Acceptance and Records"}, {"type": "p", "text": "JAAD LOGISTICS may retain electronic records of acceptance, order confirmations, invoices, consent choices and other transaction records to demonstrate the contractual relationship and comply with legal obligations."}, {"type": "h", "text": "6. Electronic Communications"}, {"type": "p", "text": "You consent to receiving service-related electronic communications, including order confirmations, invoices, delivery updates, security notices and account messages. Marketing communications are subject to applicable consent/opt-out requirements."}, {"type": "h", "text": "7. Complaints and Escalation"}, {"type": "p", "text": "Customers may submit complaints to info@jaadlogistics.com. JAAD LOGISTICS will investigate and respond within a reasonable period appropriate to the issue and applicable law."}, {"type": "h", "text": "8. No Waiver of Mandatory Rights"}, {"type": "p", "text": "Nothing in this Agreement is intended to remove or reduce any statutory consumer, privacy or other right that cannot legally be waived."}]}, "data-processing-addendum": {"title": "Data Processing Addendum", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. Purpose"}, {"type": "p", "text": "This Data Processing Addendum (“DPA”) applies where a JAAD LOGISTICS business/ERP customer (“Customer”) uses the JAAD LOGISTICS platform to process personal data for which the Customer determines the purposes and means of processing and JAAD processes that data on the Customer’s behalf."}, {"type": "h", "text": "2. Roles"}, {"type": "p", "text": "The Customer is generally the controller/business responsible for the personal data it uploads or instructs JAAD LOGISTICS to process. JAAD LOGISTICS acts as processor/service provider to the extent described in the applicable agreement, unless JAAD LOGISTICS independently determines purposes of processing for its own legal, security, billing or operational purposes."}, {"type": "h", "text": "3. Processing Instructions"}, {"type": "p", "text": "JAAD LOGISTICS will process Customer Data only to provide, secure, maintain and support the Services, comply with lawful instructions, and as otherwise permitted by applicable law or the main agreement."}, {"type": "h", "text": "4. Confidentiality"}, {"type": "p", "text": "JAAD LOGISTICS will require personnel authorized to process Customer Data to maintain confidentiality, subject to lawful disclosure requirements."}, {"type": "h", "text": "5. Security"}, {"type": "p", "text": "JAAD LOGISTICS will maintain reasonable technical and organizational measures appropriate to the risks, including access control, authentication, logging, backup/recovery and other measures appropriate to the service."}, {"type": "h", "text": "6. Subprocessors"}, {"type": "p", "text": "JAAD LOGISTICS may use Subprocessors such as hosting, cloud, communications, analytics and security providers. JAAD LOGISTICS will impose appropriate contractual privacy obligations and, where required, provide a mechanism for customers to obtain information about relevant Subprocessors."}, {"type": "h", "text": "7. Data Subject Requests"}, {"type": "p", "text": "Where JAAD LOGISTICS receives a request from an individual concerning Customer Data for which the Customer is controller, JAAD LOGISTICS may direct the requester to the Customer and will provide reasonable assistance where required by applicable law and the agreement."}, {"type": "h", "text": "8. Security Incidents"}, {"type": "p", "text": "JAAD LOGISTICS will maintain an incident-response process and notify affected customers of qualifying incidents in accordance with applicable law and contractual requirements, taking account of the nature and risk of the incident."}, {"type": "h", "text": "9. Deletion/Return"}, {"type": "p", "text": "At the end of the service, JAAD LOGISTICS will delete or return Customer Data as agreed, subject to lawful retention requirements, backups and security logs that cannot reasonably be deleted immediately."}, {"type": "h", "text": "10. International Processing"}, {"type": "p", "text": "Where Customer Data is processed outside Nigeria or outside the relevant jurisdiction, the parties will use applicable legal safeguards where required."}, {"type": "h", "text": "11. Audit and Compliance"}, {"type": "p", "text": "Where required by applicable data-protection law, JAAD LOGISTICS will provide reasonable information necessary to demonstrate compliance, subject to confidentiality, security and proportionality limits."}, {"type": "h", "text": "12. Conflict"}, {"type": "p", "text": "If this DPA conflicts with the main services agreement on data protection, this DPA controls only to the extent necessary to address the applicable data-processing obligations."}]}, "ccpa-cpra": {"title": "CCPA / CPRA", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. California Privacy Notice"}, {"type": "p", "text": "This Supplemental California Privacy Notice applies only to the extent JAAD LOGISTICS is subject to the California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act (collectively, “CCPA”), and only to California residents to whom the CCPA grants rights."}, {"type": "p", "text": "The CCPA can apply to qualifying for-profit businesses doing business in California that meet statutory thresholds. The California Attorney General currently identifies thresholds including annual gross revenue over $25 million, buying/selling/sharing personal information of at least 100,000 California residents/households, or deriving at least 50% of annual revenue from selling California residents’ personal information."}, {"type": "h", "text": "2. Categories We May Collect"}, {"type": "p", "text": "Identifiers/contact details; commercial and transaction information; internet or network activity; geolocation information where collected; account credentials; customer-service communications; and other categories described in the main Privacy Policy."}, {"type": "h", "text": "3. California Rights"}, {"type": "p", "text": "Subject to statutory exceptions, a California consumer may have rights to know/access, delete, correct, opt out of sale or sharing, limit certain uses/disclosures of sensitive personal information, and receive non-discriminatory treatment for exercising rights."}, {"type": "h", "text": "4. Sale/Sharing"}, {"type": "p", "text": "JAAD does not intend to sell personal information as a general business practice. If JAAD LOGISTICS engages in activity that legally constitutes a sale or sharing under the CCPA, JAAD LOGISTICS will provide the notices and opt-out mechanisms required by law."}, {"type": "h", "text": "5. Requests"}, {"type": "p", "text": "Submit a request to privacy@jaadlogistics.com JAAD LOGISTICS may verify identity as required and will process requests within statutory timeframes and applicable exceptions."}, {"type": "h", "text": "6. Authorized Agents and Non-Discrimination"}, {"type": "p", "text": "Where permitted, consumers may use an authorized agent to make a request, subject to identity and authorization verification. JAAD LOGISTICS will not discriminate unlawfully against a consumer for exercising a CCPA right."}]}, "customer-protection-claim-policy": {"title": "Customer Protection & Claim Policy", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. Customer Protection Commitment"}, {"type": "p", "text": "JAAD LOGISITCS is committed to fair dealing, reasonable care in handling shipments and customer information, transparent charges, secure account management and accessible complaint channels."}, {"type": "h", "text": "2. Account Protection"}, {"type": "p", "text": "Customers should use strong passwords, keep credentials confidential, enable available security features, avoid sharing one-time codes and immediately report suspicious activity."}, {"type": "h", "text": "3. Shipment Protection"}, {"type": "p", "text": "Customers should use appropriate packaging, accurate addresses and truthful package descriptions. JAAD LOGISITCS may impose special handling conditions for fragile, high-value, restricted or unusual goods."}, {"type": "h", "text": "4. Delivery Protection"}, {"type": "p", "text": "JAAD LOGISITCS may use delivery confirmation, recipient verification, timestamps, status records, photographs or other proof-of-delivery mechanisms where appropriate and lawful."}, {"type": "h", "text": "5. Claims"}, {"type": "p", "text": "Customers should report loss, damage, shortage, incorrect delivery or other service incidents through the official claims channel within 48 hours. Evidence may include order number, photographs, invoice, delivery record and other relevant information."}, {"type": "h", "text": "6. Refunds"}, {"type": "p", "text": "Refunds are handled according to the applicable package/order terms. Insert approved timelines, exclusions and payment-method rules here before publication"}, {"type": "h", "text": "7. Privacy Complaints"}, {"type": "p", "text": "Privacy complaints should be directed to privacy@jaadlogistics.com. Customers may also have the right to complain to the Nigeria Data Protection Commission or another competent supervisory authority, depending on the applicable law."}, {"type": "h", "text": "8. No Waiver of Legal Rights"}, {"type": "p", "text": "Nothing in this Customer Protection Policy limits mandatory rights or remedies available under applicable consumer, contract, privacy, transport or other law."}]}, "legal-notice": {"title": "Legal Notice", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "h", "text": "1. Business Identification"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\nRegistered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\nNature of business: Logistics Service"}, {"type": "h", "text": "2. Website Ownership"}, {"type": "p", "text": "The website and its content, software, design, branding, databases and related materials are owned by or licensed to JAAD LOGISTICS unless otherwise stated."}, {"type": "h", "text": "3. No Professional Advice"}, {"type": "p", "text": "Information on the website is general operational information and does not constitute legal, financial, tax, medical or other professional advice."}, {"type": "h", "text": "4. External Links"}, {"type": "p", "text": "Links to third-party websites are provided for convenience. JAAD LOGISTICS does not control or guarantee third-party content, availability or privacy practices."}, {"type": "h", "text": "5. Accuracy and Availability"}, {"type": "p", "text": "JAAD LOGISTICS aims to keep website information accurate and available but does not guarantee that all content is complete, current or uninterrupted. Service-specific terms control where applicable."}, {"type": "p", "text": "6. Contact\nWebsite: www.jaadlogistics.com\nGeneral customer support email: info@jaadlogistics.com\nPrivacy/Data Protection email: privacy@jaadlogistics.com\nPhone/WhatsApp: 08061472153\nClaims/refunds email: claims@jaadlogistics.com"}]}, "legal-regulatory-reference-note": {"title": "Legal & Regulatory Reference Note", "blocks": [{"type": "p", "text": "Effective Date: 30 August 2026"}, {"type": "p", "text": "JAAD LOGISTICS\nBusiness Name Registration No.: BN 2710259\n  Registered business address: 64A Olushi Street, Lagos Island, Lagos, Nigeria\n     Nature of business: Logistics Service"}, {"type": "p", "text": "The Nigerian privacy provisions are drafted with the Nigeria Data Protection Act 2023 and current NDPC materials in mind. The NDPC states that data subjects have rights including being informed, access, rectification, objection, restriction, portability, erasure, complaint and rights relating to automated decision-making."}, {"type": "p", "text": "The NDPC also states that qualifying personal-data breaches must be handled under the statutory notification framework, including a 72-hour notification requirement for a breach likely to result in risk to individuals’ rights and freedoms."}, {"type": "p", "text": "The GDPR and CCPA/CPRA sections are supplemental. GDPR applicability depends on the circumstances, including offering goods/services to individuals in the EU or monitoring behaviour in the EU. The CCPA applies only where its statutory scope and thresholds are met; California consumers may have access, deletion, correction, opt-out, limitation and non-discrimination rights subject to exceptions."}, {"type": "p", "text": "This pack should be reviewed by a qualified Nigerian lawyer and, where applicable, a licensed data-protection professional before publication. Policies cannot by themselves guarantee compliance: JAAD LOGISTICS must also implement appropriate technical, organizational, contractual and operational controls."}]}};

function Highlighted({ text }) {
  const parts = text.split(/(JAAD\s+LOGISTICS)/gi);
  return parts.map((part, i) => {
    if (/^JAAD\s+LOGISTICS$/i.test(part)) {
      const words = part.split(/\s+/);
      return (
        <strong key={i}>
          <span style={{ color: "#e5231b" }}>{words[0]}</span>{" "}
          <span style={{ color: "#000000" }}>{words[1]}</span>
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function DocModal({ docKey, onClose }) {
  if (!docKey) return null;
  const doc = LEGAL_DOCS[docKey];
  if (!doc) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-white text-[#1a1a1a] rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 sm:p-10 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#1a1a1a] font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        {LOGO_URL && <img src={LOGO_URL} alt="JAAD Logistics" className="h-14 w-auto mb-6" />}
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{doc.title}</h2>
        {doc.blocks.map((b, i) =>
          b.type === "h" ? (
            <h3 key={i} className="font-bold text-base mt-6 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Highlighted text={b.text} />
            </h3>
          ) : (
            <p key={i} className="text-sm text-[#3a3a3a] leading-relaxed mb-3" style={{ textAlign: "justify" }}>
              <Highlighted text={b.text} />
            </p>
          )
        )}
      </div>
    </div>
  );
}

const Logo = () => (
  <div className="flex items-center gap-2">
    {LOGO_URL ? (
      <img src={LOGO_URL} alt="JAAD Logistics" className="h-8 w-auto" />
    ) : (
      <span className="w-8 h-8 rounded flex items-center justify-center bg-gradient-to-br from-[#ff3b30] to-[#8a0f0a] text-white font-bold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>J</span>
    )}
  </div>
);

const Icon = ({ name, className }) => {
  const paths = {
    pulse: "M3 12h4l2-7 4 14 2-7h6",
    workflow: "M4 6h4v4H4V6zm12 8h4v4h-4v-4zM8 8h5a3 3 0 013 3v3",
    cloud: "M7 18a4 4 0 01-.6-7.96A5.5 5.5 0 0117.5 9 4 4 0 0117 18H7z",
    up: "M3 17l6-6 4 4 8-8m0 0h-5m5 0v5",
    scale: "M8 3h8l-2 4h4l-8 14 2-9H8l2-9z",
    team: "M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-8.13a4 4 0 110 8 4 4 0 010-8zm7 3a3 3 0 100-6 3 3 0 000 6zM6 9a3 3 0 100-6 3 3 0 000 6z",
    check: "M5 13l4 4L19 7",
    shield: "M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z",
    lock: "M6 10V7a6 6 0 1112 0v3m-13 0h14v10H5V10z",
    badge: "M12 2l2.4 2.6L18 4l.4 3.6L22 9l-2 3 2 3-3.6 1.4L18 20l-3.6-.6L12 22l-2.4-2.6L6 20l-.4-3.6L2 15l2-3-2-3 3.6-1.4L6 4l3.6.6L12 2z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  );
};

const Hexagons = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 800 600" preserveAspectRatio="none">
    {[[40,60,70],[30,220,40],[90,420,55],[140,130,30],[700,480,90],[740,90,45],[640,40,30]].map(([cx,cy,r],i) => (
      <polygon key={i}
        points={Array.from({length:6},(_,k)=>{const a=(Math.PI/3)*k-Math.PI/6;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" ")}
        fill="none" stroke="#ff3b30" strokeOpacity="0.25" strokeWidth="1.5" />
    ))}
  </svg>
);

const LaptopMockup = () => (
  <div className="relative w-full max-w-md mx-auto">
    <div className="rounded-t-xl border border-[#2a2a2e] bg-[#141417] p-3 shadow-2xl">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#ff3b30]"></span>
        <span className="w-2 h-2 rounded-full bg-[#4a4a50]"></span>
        <span className="w-2 h-2 rounded-full bg-[#4a4a50]"></span>
        <span className="ml-2 text-[10px] text-[#7a7a80]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>jaad-erp.app/dashboard</span>
      </div>
      <div className="bg-[#0e0e10] rounded-lg p-4 border border-[#232327]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white">Fleet overview</span>
          <span className="text-[10px] text-[#7a7a80]">Today</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[["₦815,000","Revenue"],["12","Active loads"],["13.7%","Growth"]].map(([v,l]) => (
            <div key={l} className="bg-[#18181b] rounded p-2 border border-[#232327]">
              <div className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{v}</div>
              <div className="text-[9px] text-[#7a7a80] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-[#18181b] rounded p-2 border border-[#232327] h-20">
            <svg viewBox="0 0 100 40" className="w-full h-full">
              <polyline points="0,32 15,26 30,30 45,14 60,20 75,8 100,12" fill="none" stroke="#ff3b30" strokeWidth="2" />
            </svg>
          </div>
          <div className="w-16 h-20 bg-[#18181b] rounded border border-[#232327] flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-10 h-10">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#232327" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#ff3b30" strokeWidth="4" strokeDasharray="65 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
              <text x="18" y="21" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">65%</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
    <div className="h-4 bg-gradient-to-b from-[#2a2a2e] to-[#111113] mx-2 border-x border-b border-[#2a2a2e]" style={{ clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)" }}></div>
  </div>
);

const featureCards = [
  { icon: "pulse", title: "Real-time shipment tracking", body: "Every booking updates live, so customers stop calling to ask where their load is." },
  { icon: "workflow", title: "Automated invoicing", body: "Bookings turn into invoices in naira, VAT included, without anyone opening a spreadsheet." },
  { icon: "cloud", title: "Secure cloud platform", body: "Waybills, manifests, and payment records, backed up and reachable from anywhere." },
];

const whyChoose = [
  { icon: "up", title: "Fewer manual steps", body: "Dispatch, invoicing, and reporting run from one login instead of five different tools." },
  { icon: "scale", title: "Grows with your fleet", body: "Add drivers, routes, and staff seats as you scale, without switching systems." },
  { icon: "team", title: "One view for the whole team", body: "Dispatch, finance, and drivers each get their own access to exactly what they need." },
];

const assurances = [
  { icon: "badge", label: "CAC registered Nigerian company" },
  { icon: "lock", label: "Bank-level encrypted data" },
  { icon: "shield", label: "NDPR data compliant" },
];


const legalLinks = [
  { label: "Privacy Policy", key: "privacy-policy" },
  { label: "Terms of Use", key: "terms-of-use" },
  { label: "User Agreement", key: "user-agreement" },
  { label: "Cookie Policy", key: "cookie-policy" },
  { label: "Data Processing Addendum", key: "data-processing-addendum" },
  { label: "CCPA / CPRA", key: "ccpa-cpra" },
  { label: "Customer Protection & Claim Policy", key: "customer-protection-claim-policy" },
  { label: "Legal Notice", key: "legal-notice" },
  { label: "Legal & Regulatory Reference Note", key: "legal-regulatory-reference-note" },
];

const plans = [
  { name: "Starter", price: "5,000", tagline: "For a small team shipping a handful of loads a month.",
    features: ["Up to 25 shipments a month","Real-time tracking links","Digital waybills and manifests","1 admin seat","Email support"] },
  { name: "Growth", price: "10,000", tagline: "For teams running daily dispatch and invoicing.",
    features: ["Up to 150 shipments a month","Everything in Starter","Automated invoicing and receipts","5 staff seats with permissions","WhatsApp and SMS alerts","Priority support"], featured: true },
  { name: "Business", price: "20,000", tagline: "For fleets that need finance, HR, and reporting in one place.",
    features: ["Unlimited shipments","Everything in Growth","Fleet and driver management","Finance, payroll, and HR modules","Custom reports and exports","Dedicated account manager"] },
];

export default function Home() {
  const [nav, setNav] = useState(false);
  const [openDoc, setOpenDoc] = useState(null);
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/95 backdrop-blur border-b border-[#1c1c20]">
        <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between">
          <Logo />
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-[#b8b8bd] hover:text-white">Platform</a>
            <a href="#features" className="text-sm font-medium text-[#b8b8bd] hover:text-white">Features</a>
            <a href="#pricing" className="text-sm font-medium text-[#b8b8bd] hover:text-white">Pricing</a>
          </nav>
          <div className="hidden lg:flex items-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#b8b8bd] hover:text-white px-3 py-2">Contact sales</a>
            <a href={CUSTOMER_LOGIN_URL} className="text-sm font-bold text-white bg-gradient-to-r from-[#ff3b30] to-[#c9160c] rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity">Customer login</a>
            <span className="w-px h-6 bg-[#2a2a2e] mx-1"></span>
            <a href={ADMIN_LOGIN_URL} className="text-sm font-semibold text-[#b8b8bd] hover:text-white px-3 py-2">Admin login</a>
          </div>
          <button className="lg:hidden text-white" onClick={() => setNav(!nav)} aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
          </button>
        </div>
        {nav && (
          <div className="lg:hidden bg-[#0a0a0c] border-t border-[#1c1c20] px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-sm text-[#b8b8bd]">Features</a>
            <a href="#pricing" className="text-sm text-[#b8b8bd]">Pricing</a>
            <a href={CUSTOMER_LOGIN_URL} className="text-sm font-bold text-white bg-[#ff3b30] rounded-md px-4 py-2.5 text-center mt-2">Customer login</a>
            <a href={ADMIN_LOGIN_URL} className="text-sm font-semibold text-[#b8b8bd] border border-[#2a2a2e] rounded-md px-4 py-2.5 text-center">Admin login</a>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 80% 30%, rgba(255,59,48,.18), transparent 55%)" }}></div>
        <Hexagons />
        <div className="max-w-6xl mx-auto px-6 py-20 relative grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <h1 className="text-[38px] lg:text-[50px] font-bold leading-[1.1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Run your <span className="text-[#ff3b30]">haulage business</span> from one dashboard
            </h1>
            <p className="text-[#b8b8bd] text-lg mt-5 max-w-md leading-relaxed">
              Bookings, invoicing, fleet, and customer support in one place, built for Nigerian logistics companies moving real freight every day.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href="#pricing" className="bg-gradient-to-r from-[#ff3b30] to-[#c9160c] text-white font-bold text-sm px-6 py-3.5 rounded-md hover:opacity-90 transition-opacity">See pricing</a>
            </div>
          </div>
          <LaptopMockup />
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {featureCards.map((f) => (
            <div key={f.title} className="relative bg-[#111113] border border-[#232327] rounded-lg p-6 overflow-hidden">
              <div className="w-11 h-11 rounded-md bg-[#1c0e0d] border border-[#3a1a17] flex items-center justify-center text-[#ff3b30] mb-4"><Icon name={f.icon} className="w-5 h-5" /></div>
              <h3 className="font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
              <p className="text-sm text-[#8a8a90] mt-2 leading-relaxed">{f.body}</p>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#ff3b30] to-transparent"></div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Why choose JAAD ERP</h2>
        <div className="grid md:grid-cols-3 gap-10 mt-12 text-left">
          {whyChoose.map((w) => (
            <div key={w.title}>
              <div className="w-10 h-10 rounded-md bg-[#1c0e0d] border border-[#3a1a17] flex items-center justify-center text-[#ff3b30] mb-4"><Icon name={w.icon} className="w-5 h-5" /></div>
              <h3 className="font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{w.title}</h3>
              <p className="text-sm text-[#8a8a90] mt-2 leading-relaxed">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#1c1c20] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-center text-sm font-semibold text-[#7a7a80] tracking-wide mb-8">Built for how Nigerian logistics companies actually operate</h3>
          <div className="flex flex-wrap justify-center gap-x-14 gap-y-6">
            {assurances.map((a) => (
              <div key={a.label} className="flex items-center gap-2.5 text-[#b8b8bd]">
                <Icon name={a.icon} className="w-5 h-5 text-[#ff3b30]" />
                <span className="text-sm font-medium">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Pick a plan</h2>
          <p className="text-[#8a8a90] mt-4 leading-relaxed">Every plan includes tracking links, waybills, and a customer portal. Upgrade or downgrade any time.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => (
            <div key={p.name} className={`relative bg-[#111113] rounded-lg p-8 flex flex-col overflow-hidden ${p.featured ? "border-2 border-[#ff3b30]" : "border border-[#232327]"}`}>
              {p.featured && <span className="self-start bg-gradient-to-r from-[#ff3b30] to-[#c9160c] text-white text-xs font-bold px-3 py-1 rounded-md mb-4">Most chosen</span>}
              <h3 className="font-bold text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</h3>
              <p className="text-sm text-[#8a8a90] mt-2 leading-relaxed min-h-[40px]">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>&#8358;{p.price}</span>
                <span className="text-sm text-[#8a8a90]">/month</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#d0d0d4]">
                    <Icon name="check" className="w-4 h-4 text-[#ff3b30] flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href={CUSTOMER_SIGNUP_URL} className={`mt-8 text-center text-sm font-bold px-5 py-3 rounded-md transition-opacity ${p.featured ? "bg-gradient-to-r from-[#ff3b30] to-[#c9160c] text-white hover:opacity-90" : "bg-white text-[#0a0a0c] hover:opacity-90"}`}>
                Subscribe to {p.name}
              </a>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#ff3b30] to-transparent"></div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#111113] border border-[#232327] rounded-lg px-8 py-6">
          <div>
            <div className="font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Running more than 150 shipments a month?</div>
            <div className="text-sm text-[#8a8a90] mt-1">Get a custom plan built around your fleet size and workflow.</div>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="bg-white text-[#0a0a0c] font-bold text-sm px-6 py-3 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap">Contact sales</a>
        </div>
      </section>

      <footer className="border-t border-[#1c1c20] py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-6">
            {legalLinks.map((l) => (
              <button key={l.label} onClick={() => setOpenDoc(l.key)} className="text-xs text-[#7a7a80] hover:text-[#b8b8bd]">{l.label}</button>
            ))}
          </div>
          <div className="relative flex flex-col sm:flex-row items-center gap-3">
            {LOGO_URL && <img src={LOGO_URL} alt="JAAD Logistics" className="h-6 w-auto sm:absolute sm:left-0" />}
            <p className="text-sm text-[#7a7a80] sm:w-full sm:text-center">&copy; 2026 JAAD Logistics. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <DocModal docKey={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
