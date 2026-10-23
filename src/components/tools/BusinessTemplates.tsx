import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileSignature,
  Download,
  Copy,
  CheckCircle2,
  FileText,
  Info,
  Search,
  Scale,
  Users,
  Briefcase,
  Home,
  DollarSign,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Cpu,
  Palette,
  ShieldCheck,
  Key,
  FileCheck,
  Lock,
  Receipt,
  Award,
  Compass,
  UserCheck,
  Printer,
  Sparkles,
} from 'lucide-react';

export interface FormTemplateCategory {
  id: string;
  name: string;
  countLabel: string;
  count: number;
  icon: React.ElementType;
}

export const TEMPLATE_CATEGORIES: FormTemplateCategory[] = [
  { id: 'legal', name: 'Legal & Contracts', countLabel: '1,150+ Templates', count: 1150, icon: Scale },
  { id: 'hr', name: 'Human Resources & Employment', countLabel: '920+ Templates', count: 920, icon: Users },
  { id: 'business', name: 'Business & Startups', countLabel: '1,280+ Templates', count: 1280, icon: Briefcase },
  { id: 'real-estate', name: 'Real Estate & Rental Leases', countLabel: '840+ Templates', count: 840, icon: Home },
  { id: 'finance', name: 'Finance & Accounting', countLabel: '780+ Templates', count: 780, icon: DollarSign },
  { id: 'medical', name: 'Healthcare & Medical Consents', countLabel: '640+ Templates', count: 640, icon: HeartPulse },
  { id: 'sales', name: 'Sales, Proposals & Quotes', countLabel: '890+ Templates', count: 890, icon: ShoppingBag },
  { id: 'nonprofit', name: 'Non-Profit & Education', countLabel: '520+ Templates', count: 520, icon: GraduationCap },
  { id: 'tech', name: 'Technology & IP', countLabel: '670+ Templates', count: 670, icon: Cpu },
  { id: 'creative', name: 'Freelance & Creative Services', countLabel: '740+ Templates', count: 740, icon: Palette },
  { id: 'affidavits', name: 'Affidavits & Sworn Statements', countLabel: '460+ Templates', count: 460, icon: ShieldCheck },
  { id: 'poa', name: 'Power of Attorney (POA)', countLabel: '380+ Templates', count: 380, icon: Key },
  { id: 'bill-of-sale', name: 'Bills of Sale & Asset Transfer', countLabel: '490+ Templates', count: 490, icon: FileCheck },
  { id: 'nda', name: 'NDAs & Confidentiality', countLabel: '560+ Templates', count: 560, icon: Lock },
  { id: 'invoicing', name: 'Invoices, Receipts & Billing', countLabel: '820+ Templates', count: 820, icon: Receipt },
  { id: 'certificates', name: 'Certificates & Recognition', countLabel: '410+ Templates', count: 410, icon: Award },
  { id: 'travel-waivers', name: 'Travel, Events & Waivers', countLabel: '390+ Templates', count: 390, icon: Compass },
  { id: 'family', name: 'Personal & Family Planning', countLabel: '480+ Templates', count: 480, icon: UserCheck },
];

export interface FormTemplateItem {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  defaultPartyA: string;
  defaultPartyB: string;
  defaultScope: string;
  defaultAmount: string;
  defaultTerm: string;
  defaultJurisdiction: string;
  bodyGenerator: (p: {
    partyA: string;
    partyB: string;
    date: string;
    scope: string;
    amount: string;
    term: string;
    jurisdiction: string;
  }) => string;
}

export const TEMPLATES_CATALOG: FormTemplateItem[] = [
  // 1. Legal
  {
    id: 'contractor-agreement',
    categoryId: 'legal',
    title: 'Independent Contractor Agreement',
    summary: 'Standard consulting & independent service provider agreement with intellectual property assignment.',
    defaultPartyA: 'Apex Systems Inc. ("Client")',
    defaultPartyB: 'Nova Tech Advisory LLC ("Contractor")',
    defaultScope: 'Cloud Infrastructure Architecture & Security Hardening',
    defaultAmount: '$18,500 USD (Net-15 Milestone Payments)',
    defaultTerm: '12 Months with 30-Day Mutual Cancellation Notice',
    defaultJurisdiction: 'State of Delaware, USA',
    bodyGenerator: (p) => `THIS INDEPENDENT CONTRACTOR AGREEMENT is made effective as of ${p.date}, between ${p.partyA} and ${p.partyB}.

1. ENGAGEMENT AND SERVICES
Client hereby engages Contractor to perform the following services: ${p.scope}. Contractor agrees to complete deliverables with professional skill and diligence.

2. COMPENSATION & PAYMENT TERMS
In consideration for services rendered, Client shall pay Contractor ${p.amount}. Invoices shall be payable within 15 calendar days of receipt.

3. WORK PRODUCT & INTELLECTUAL PROPERTY
All materials, scripts, documentation, and inventions prepared by Contractor under this Agreement shall constitute "Work Made for Hire" and the sole property of Client upon full payment.

4. CONFIDENTIALITY
Contractor agrees to keep confidential all non-public proprietary data, code repositories, and trade secrets disclosed by Client during the term of ${p.term}.

5. GOVERNING LAW
This Agreement shall be governed by and construed under the laws of ${p.jurisdiction}.

IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first above written.

_______________________________________          _______________________________________
${p.partyA}                                       ${p.partyB}
Authorized Signature                             Authorized Signature`,
  },
  // 2. HR
  {
    id: 'employment-offer',
    categoryId: 'hr',
    title: 'Formal Employment Offer Letter',
    summary: 'Comprehensive at-will employment offer letter including compensation, equity, and benefits terms.',
    defaultPartyA: 'Vanguard Enterprise Solutions Inc.',
    defaultPartyB: 'Sarah Jenkins',
    defaultScope: 'Principal Software Engineer (Full-Time)',
    defaultAmount: '$165,000 USD Annual Base Salary + 15% Bonus',
    defaultTerm: 'Full-Time At-Will Employment starting November 1, 2026',
    defaultJurisdiction: 'State of California, USA',
    bodyGenerator: (p) => `CONFIDENTIAL EMPLOYMENT OFFER LETTER

Date: ${p.date}
Candidate: ${p.partyB}

Dear ${p.partyB},

On behalf of ${p.partyA}, we are delighted to extend this formal offer of employment for the position of: ${p.scope}.

1. COMPENSATION & INCENTIVES
Your annualized base compensation will be ${p.amount}, payable semi-monthly in accordance with standard payroll procedures, subject to standard statutory withholdings.

2. TERMS OF EMPLOYMENT & BENEFITS
This offer represents ${p.term}. You will be eligible for comprehensive health, dental, vision insurance, and 401(k) retirement matching.

3. AT-WILL EMPLOYMENT
Your employment with the Company is for no specified period and constitutes at-will employment under the laws of ${p.jurisdiction}.

To accept this offer, please sign and return this letter by ${p.date}.

Sincerely,

_______________________________________          _______________________________________
${p.partyA} (Authorized Executive)                Accepted & Agreed: ${p.partyB}`,
  },
  // 3. Business
  {
    id: 'partnership-agreement',
    categoryId: 'business',
    title: 'General Partnership & Co-Founder Agreement',
    summary: 'Co-founder partnership agreement establishing equity splits, voting rights, and initial capital contributions.',
    defaultPartyA: 'Marcus Vance (Founder A)',
    defaultPartyB: 'Elena Rostova (Founder B)',
    defaultScope: 'Development and Commercialization of SaaS Data Platform',
    defaultAmount: '50% / 50% Equal Equity Split with 4-Year Vesting',
    defaultTerm: 'Perpetual until Dissolution or Mutual Redemption',
    defaultJurisdiction: 'State of New York, USA',
    bodyGenerator: (p) => `FOUNDERS' PARTNERSHIP AND EQUITY AGREEMENT

This Partnership Agreement is executed as of ${p.date}, between ${p.partyA} and ${p.partyB}.

1. PURPOSE & VENTURE SCOPE
The Partners hereby form a general partnership for the principal purpose of: ${p.scope}.

2. CAPITAL & EQUITY ALLOCATION
Initial capital contributions and ownership percentages shall be structured as: ${p.amount}. All founder shares shall be subject to a standard 4-year vesting schedule with a 1-year cliff.

3. DECISION-MAKING & GOVERNANCE
Major corporate decisions, capital expenditures exceeding $10,000, and issuance of additional partnership interests require unanimous written consent of both Partners.

4. TERM & DISSOLUTION
The partnership term shall be ${p.term}. Any disputes shall be resolved pursuant to the laws of ${p.jurisdiction}.

IN WITNESS WHEREOF, the Partners have signed below as of ${p.date}.

_______________________________________          _______________________________________
${p.partyA}                                       ${p.partyB}`,
  },
  // 4. Real Estate
  {
    id: 'residential-lease',
    categoryId: 'real-estate',
    title: 'Residential Lease Agreement',
    summary: 'Comprehensive residential lease agreement covering rent, security deposit, maintenance, and rules.',
    defaultPartyA: 'Heritage Property Management LLC ("Landlord")',
    defaultPartyB: 'David Miller & Emily Miller ("Tenant")',
    defaultScope: 'Apartment 4B, 742 Evergreen Terrace, Metropolis',
    defaultAmount: '$2,650 USD / Month ($2,650 Security Deposit)',
    defaultTerm: '12 Months (Commencing Nov 1, 2026 to Oct 31, 2027)',
    defaultJurisdiction: 'State of Illinois, USA',
    bodyGenerator: (p) => `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is made this ${p.date}, between ${p.partyA} ("Landlord") and ${p.partyB} ("Tenant").

1. PREMISES
Landlord leases to Tenant the premises located at: ${p.scope}.

2. TERM & RENTAL PAYMENTS
The term of this lease shall be ${p.term}. Tenant agrees to pay Landlord ${p.amount}, due on or before the 1st day of each calendar month.

3. SECURITY DEPOSIT
Upon execution, Tenant deposits the required security deposit as collateral for full performance of lease covenants, refundable within statutory limits under ${p.jurisdiction}.

4. UTILITIES & MAINTENANCE
Tenant shall keep the premises in clean, sanitary condition and promptly notify Landlord of any required repairs.

LANDLORD:                                        TENANT:
_______________________________________          _______________________________________
${p.partyA}                                       ${p.partyB}`,
  },
  // 5. Finance
  {
    id: 'promissory-note',
    categoryId: 'finance',
    title: 'Promissory Note & Loan Agreement',
    summary: 'Legally enforceable debt acknowledgment note with specified interest rate, schedule, and default terms.',
    defaultPartyA: 'Apex Capital Ventures ("Lender")',
    defaultPartyB: 'Bluecrest Solutions LLC ("Borrower")',
    defaultScope: 'Working Capital & Inventory Expansion Facility',
    defaultAmount: '$50,000 USD Principal Amount (6.5% Annual Interest)',
    defaultTerm: '24 Equal Monthly Installments of $2,227.42 USD',
    defaultJurisdiction: 'State of Texas, USA',
    bodyGenerator: (p) => `SECURED PROMISSORY NOTE

Principal: ${p.amount}
Date of Execution: ${p.date}

FOR VALUE RECEIVED, ${p.partyB} ("Borrower") promises to pay to the order of ${p.partyA} ("Lender"), the principal sum with interest as set forth herein.

1. PURPOSE & LOAN FACILITY
The proceeds of this note are advanced solely for: ${p.scope}.

2. REPAYMENT SCHEDULE
Repayment shall occur pursuant to the following schedule: ${p.term}. Payments are due on the 15th of each month.

3. PREPAYMENT & DEFAULT
Borrower reserves the right to prepay the balance in whole or in part without penalty. Upon failure to cure any missed payment within 10 days, the entire balance becomes immediately due and payable under ${p.jurisdiction}.

BORROWER:
_______________________________________
${p.partyB} (Authorized Representative)`,
  },
  // 6. Medical
  {
    id: 'hipaa-release',
    categoryId: 'medical',
    title: 'HIPAA Medical Records Release Form',
    summary: 'Compliant health information disclosure authorization complying with HIPAA standards.',
    defaultPartyA: 'St. Jude Regional Medical Center ("Disclosing Facility")',
    defaultPartyB: 'Metro Life Insurance Underwriters ("Recipient")',
    defaultScope: 'Complete Medical History, Lab Reports & Diagnostic Imaging',
    defaultAmount: 'N/A (Patient Information Authorization)',
    defaultTerm: 'Valid for 12 Months from Date of Execution',
    defaultJurisdiction: 'Federal HIPAA Privacy Rule (45 CFR § 164.508)',
    bodyGenerator: (p) => `PATIENT AUTHORIZATION FOR RELEASE OF PROTECTED HEALTH INFORMATION (HIPAA)

Patient Name: Johnathan R. Doe
Date of Authorization: ${p.date}

1. AUTHORIZATION TO DISCLOSE
I hereby authorize ${p.partyA} to release and disclose my protected health information to: ${p.partyB}.

2. EXTENT & NATURE OF INFORMATION
Information authorized for disclosure includes: ${p.scope}.

3. PURPOSE & VALIDITY
This disclosure is authorized for evaluation and processing. This authorization remains in force for ${p.term}.

4. PATIENT RIGHTS
I understand that I have the right to revoke this authorization in writing at any time, governed by ${p.jurisdiction}.

_______________________________________          _______________________________________
Patient / Legal Guardian Signature               Witness Signature`,
  },
  // 7. Sales
  {
    id: 'commercial-quotation',
    categoryId: 'sales',
    title: 'Commercial Quotation & Proposal',
    summary: 'Binding sales quotation outlining scope of deliverables, unit pricing, milestone payments, and SLA.',
    defaultPartyA: 'NextGen Cloud Solutions Ltd.',
    defaultPartyB: 'Global Retail Enterprises LLC',
    defaultScope: 'Enterprise Cloud Migration & 24/7 Monitored Infrastructure SLA',
    defaultAmount: '$34,500 USD Total Project Investment',
    defaultTerm: 'Quotation Binding for 30 Calendar Days from Issuance',
    defaultJurisdiction: 'State of Delaware, USA',
    bodyGenerator: (p) => `COMMERCIAL SALES PROPOSAL & FORMAL QUOTATION

Quotation Date: ${p.date}
Service Provider: ${p.partyA}
Prospective Client: ${p.partyB}

1. EXECUTIVE SUMMARY & DELIVERABLES
We are pleased to submit this formal proposal for: ${p.scope}.

2. INVESTMENT & PAYMENT TERMS
The total agreed fee for this engagement is ${p.amount}. Billing shall occur 50% upon project kickoff and 50% upon milestone completion.

3. ACCEPTANCE & VALIDITY
This quotation is valid under the following duration: ${p.term}.

PREPARED BY:                                     ACCEPTED & CONFIRMED:
_______________________________________          _______________________________________
${p.partyA}                                       ${p.partyB}`,
  },
  // 8. Non-Profit
  {
    id: 'volunteer-agreement',
    categoryId: 'nonprofit',
    title: 'Volunteer Service & Liability Waiver',
    summary: 'Agreement setting expectations for volunteer duties, background consent, and injury liability waiver.',
    defaultPartyA: 'Clearwater Community Foundation (501(c)(3))',
    defaultPartyB: 'Emily R. Watson ("Volunteer")',
    defaultScope: 'Youth Mentorship & Weekend Educational Workshop Assistance',
    defaultAmount: 'Uncompensated Community Volunteer Service',
    defaultTerm: 'Academic Year 2026-2027',
    defaultJurisdiction: 'State of Washington, USA',
    bodyGenerator: (p) => `VOLUNTEER SERVICE AGREEMENT & LIABILITY WAIVER

Date: ${p.date}
Organization: ${p.partyA}
Volunteer: ${p.partyB}

1. VOLUNTEER PARTICIPATION
Volunteer agrees to provide uncompensated volunteer assistance regarding: ${p.scope}.

2. NATURE OF SERVICE
Volunteer acknowledges that services are provided voluntarily without expectation of monetary wages (${p.amount}).

3. ASSUMPTION OF RISK & WAIVER
Volunteer releases and holds harmless Organization from any claims arising out of participation during ${p.term}, subject to ${p.jurisdiction}.

_______________________________________          _______________________________________
Volunteer Signature                              Organization Representative`,
  },
  // 9. Tech
  {
    id: 'software-license',
    categoryId: 'tech',
    title: 'Software End-User License Agreement (EULA)',
    summary: 'Proprietary software license agreement defining user rights, reverse engineering prohibitions, and warranty disclaimers.',
    defaultPartyA: 'ByteCraft Technologies Inc. ("Licensor")',
    defaultPartyB: 'Enterprise End-User / Licensee ("Licensee")',
    defaultScope: 'Commercial Seat License for Enterprise Analytics Suite v4.0',
    defaultAmount: 'Non-Exclusive, Non-Transferable Commercial License',
    defaultTerm: 'Annual Subscription Term with Automatic Renewal',
    defaultJurisdiction: 'State of Delaware, USA',
    bodyGenerator: (p) => `END USER SOFTWARE LICENSE AGREEMENT (EULA)

Effective Date: ${p.date}
Licensor: ${p.partyA}
Licensee: ${p.partyB}

1. GRANT OF LICENSE
Licensor grants Licensee a non-exclusive, non-transferable license to install and execute: ${p.scope}.

2. RESTRICTIONS
Licensee shall not decompile, reverse engineer, disassemble, or create derivative works from the software.

3. TERM & TERMINATION
This license is effective for ${p.term} and governed by the laws of ${p.jurisdiction}.

LICENSOR: ${p.partyA}
LICENSEE: ${p.partyB}`,
  },
  // 10. Creative
  {
    id: 'photography-release',
    categoryId: 'creative',
    title: 'Model & Commercial Photography Release',
    summary: 'Model release granting commercial rights to photography, audio, and video recordings.',
    defaultPartyA: 'Apex Commercial Media Studios ("Photographer")',
    defaultPartyB: 'Chloe Bennett ("Model")',
    defaultScope: 'Commercial Advertising Campaign & Digital Media Distribution',
    defaultAmount: '$750 USD Full Day Modeling Fee',
    defaultTerm: 'Worldwide, Irrevocable & Royalty-Free in Perpetuity',
    defaultJurisdiction: 'State of California, USA',
    bodyGenerator: (p) => `MODEL & PHOTOGRAPHY RELEASE AGREEMENT

Date: ${p.date}
Photographer: ${p.partyA}
Model / Talent: ${p.partyB}

1. GRANT OF RIGHTS
For valuable consideration of ${p.amount}, Model hereby grants Photographer the irrevocable right to use, publish, and copyright photographs taken for: ${p.scope}.

2. SCOPE & PERPETUITY
This release grants rights for ${p.term} across all print, digital, and broadcasting mediums.

MODEL SIGNATURE:                                 PHOTOGRAPHER:
_______________________________________          _______________________________________
${p.partyB}                                       ${p.partyA}`,
  },
  // 11. Affidavits
  {
    id: 'general-affidavit',
    categoryId: 'affidavits',
    title: 'General Sworn Notarial Affidavit',
    summary: 'Formal sworn affidavit statement executed under penalty of perjury for legal, court, or banking proof.',
    defaultPartyA: 'State of Florida, County of Orange ("Jurisdiction")',
    defaultPartyB: 'Robert L. Thompson ("Affiant")',
    defaultScope: 'Sworn Statement of Facts Regarding Lost Stock Certificate',
    defaultAmount: 'Sworn Under Penalty of Perjury',
    defaultTerm: 'Permanent Legal Record',
    defaultJurisdiction: 'Notary Public, State of Florida, USA',
    bodyGenerator: (p) => `SWORN AFFIDAVIT OF FACTS

State of: ${p.partyA}
County of: Orange

I, ${p.partyB}, residing at 104 Ocean Boulevard, being duly sworn, depose and state under penalty of perjury:

1. I make this affidavit of personal knowledge regarding: ${p.scope}.
2. The facts stated herein are true, correct, and complete to the best of my knowledge and belief.
3. This instrument is executed on this ${p.date} for all lawful purposes under ${p.jurisdiction}.

_______________________________________
Signature of Affiant (${p.partyB})

Subscribed and sworn to before me this ${p.date}.

_______________________________________
Notary Public Commission Seal`,
  },
  // 12. POA
  {
    id: 'limited-poa',
    categoryId: 'poa',
    title: 'Limited Power of Attorney (POA)',
    summary: 'Legal instrument appointing an agent / attorney-in-fact for specific financial or property transactions.',
    defaultPartyA: 'Arthur C. Campbell ("Principal")',
    defaultPartyB: 'Victoria Campbell ("Attorney-in-Fact")',
    defaultScope: 'Authority to Execute Closing Documents for Real Property Sale',
    defaultAmount: 'Specific Special Power of Attorney',
    defaultTerm: 'Commencing ${p.date} and Terminating Upon Transaction Close',
    defaultJurisdiction: 'State of Ohio, USA',
    bodyGenerator: (p) => `LIMITED SPECIAL POWER OF ATTORNEY

Principal: ${p.partyA}
Appointed Agent / Attorney-in-Fact: ${p.partyB}
Date: ${p.date}

1. APPOINTMENT & GRANT OF POWER
Principal hereby designates and appoints ${p.partyB} as true and lawful Attorney-in-Fact with full power to perform on Principal's behalf: ${p.scope}.

2. TERM & TERMINATION
This Limited Power of Attorney shall remain in effect for ${p.term}.

3. GOVERNING LAW
This instrument is executed in accordance with the laws of ${p.jurisdiction}.

PRINCIPAL SIGNATURE:
_______________________________________
${p.partyA}`,
  },
  // 13. Bill of Sale
  {
    id: 'vehicle-bill-of-sale',
    categoryId: 'bill-of-sale',
    title: 'Motor Vehicle Bill of Sale',
    summary: 'Transfer of title and ownership for automotive vehicles with odometer disclosure and as-is warranty statement.',
    defaultPartyA: 'Brandon Hayes ("Seller")',
    defaultPartyB: 'Nathaniel Cole ("Buyer")',
    defaultScope: '2021 Toyota RAV4 XLE (VIN: 4T3BFREV8MW198234, Mileage: 42,150 Miles)',
    defaultAmount: '$21,400 USD (Cash / Certified Funds)',
    defaultTerm: 'Immediate Transfer of Title & Possession ("As-Is")',
    defaultJurisdiction: 'State of Michigan, USA',
    bodyGenerator: (p) => `MOTOR VEHICLE BILL OF SALE & ODOMETER DISCLOSURE

Date of Sale: ${p.date}
Seller: ${p.partyA}
Buyer: ${p.partyB}

1. VEHICLE IDENTIFICATION & DESCRIPTION
Seller hereby transfers and conveys to Buyer all right, title, and interest in the following motor vehicle: ${p.scope}.

2. PURCHASE PRICE & CONSIDERATION
The total purchase price paid by Buyer to Seller is ${p.amount}.

3. AS-IS CONDITION & ODOMETER DISCLOSURE
Seller certifies that the vehicle is sold "As-Is" with no warranties, express or implied, pursuant to the laws of ${p.jurisdiction}.

SELLER:                                          BUYER:
_______________________________________          _______________________________________
${p.partyA}                                       ${p.partyB}`,
  },
  // 14. NDA
  {
    id: 'mutual-nda',
    categoryId: 'nda',
    title: 'Mutual Non-Disclosure Agreement (Bilateral NDA)',
    summary: 'Industry-standard bilateral NDA protecting proprietary algorithms, source code, and customer data.',
    defaultPartyA: 'Apex Cloud Innovations Inc.',
    defaultPartyB: 'Horizon Capital Partners LLC',
    defaultScope: 'Proprietary AI Pipeline, Source Code Repositories & Financial Models',
    defaultAmount: 'Mutual Consideration & Trade Secret Protection',
    defaultTerm: '3 Years Confidentiality Obligations',
    defaultJurisdiction: 'State of Delaware, USA',
    bodyGenerator: (p) => `MUTUAL NON-DISCLOSURE AGREEMENT (NDA)

This Mutual Non-Disclosure Agreement is entered into as of ${p.date}, between ${p.partyA} and ${p.partyB}.

1. PURPOSE & CONFIDENTIAL INFORMATION
The parties intend to evaluate a mutual commercial opportunity regarding: ${p.scope}. "Confidential Information" encompasses all non-public technical and financial data disclosed by either party.

2. DUTY OF CONFIDENTIALITY
Each party agrees to hold all disclosed materials in strictest confidence for a term of ${p.term}.

3. GOVERNING LAW
This agreement is governed by the laws of ${p.jurisdiction}.

_______________________________________          _______________________________________
${p.partyA}                                       ${p.partyB}`,
  },
  // 15. Invoicing
  {
    id: 'payment-receipt',
    categoryId: 'invoicing',
    title: 'Official Payment Receipt & Acknowledgment',
    summary: 'Formal commercial receipt confirming payment settlement, invoice reference, and zero balance due.',
    defaultPartyA: 'Zenith Logistics & Transport Inc.',
    defaultPartyB: 'Oakwood Manufacturing Corp.',
    defaultScope: 'Settlement for Invoice #INV-2026-8891 (Freight & Warehouse Handling)',
    defaultAmount: '$8,450.00 USD (Paid in Full via Wire Transfer)',
    defaultTerm: 'Zero Outstanding Balance Due',
    defaultJurisdiction: 'State of New Jersey, USA',
    bodyGenerator: (p) => `OFFICIAL PAYMENT RECEIPT

Receipt Number: REC-${Date.now().toString().slice(-6)}
Payment Date: ${p.date}
Payee (Issuer): ${p.partyA}
Payer (Client): ${p.partyB}

1. TRANSACTION DETAILS
This document acknowledges receipt of payment for: ${p.scope}.

2. AMOUNT RECEIVED
Total Amount Received: ${p.amount}. Remaining balance is ${p.term}.

ISSUED BY:
_______________________________________
${p.partyA} (Authorized Accounts Department)`,
  },
  // 16. Certificates
  {
    id: 'certificate-achievement',
    categoryId: 'certificates',
    title: 'Certificate of Outstanding Achievement',
    summary: 'Formal recognition certificate for professional excellence, course completion, or distinguished service.',
    defaultPartyA: 'Global Technology Institute of Excellence',
    defaultPartyB: 'Alexander M. Wright',
    defaultScope: 'Mastery in Cloud Systems Engineering & Cybersecurity Architecture',
    defaultAmount: 'Conferred with Highest Honors & Distinction',
    defaultTerm: 'Lifetime Certification Credential',
    defaultJurisdiction: 'Accreditation Board of Technical Certifications',
    bodyGenerator: (p) => `CERTIFICATE OF OUTSTANDING ACHIEVEMENT

Presented by: ${p.partyA}

THIS CERTIFIES THAT
${p.partyB}

has successfully demonstrated superior proficiency and is hereby recognized for:
${p.scope}

Conferred on this ${p.date} with: ${p.amount}.

_______________________________________          _______________________________________
President / Academic Director                    Chairperson of the Board`,
  },
  // 17. Travel & Waivers
  {
    id: 'event-liability-waiver',
    categoryId: 'travel-waivers',
    title: 'Event Participation & Liability Release Waiver',
    summary: 'Assumption of risk and liability release waiver for public events, athletic tournaments, and workshops.',
    defaultPartyA: 'Summit Outdoor Expeditions LLC ("Host")',
    defaultPartyB: 'Participant / Guest ("Participant")',
    defaultScope: 'Alpine Hiking, Kayaking & Mountain Traverse Expedition',
    defaultAmount: 'Voluntary Activity Participation',
    defaultTerm: 'Duration of Scheduled Event Weekend',
    defaultJurisdiction: 'State of Colorado, USA',
    bodyGenerator: (p) => `EVENT PARTICIPATION & LIABILITY RELEASE WAIVER

Date: ${p.date}
Event Host: ${p.partyA}
Participant: ${p.partyB}

1. ACKNOWLEDGMENT OF RISKS
Participant acknowledges inherent physical risks associated with: ${p.scope}.

2. RELEASE & INDEMNIFICATION
Participant releases Host from all claims or injuries during ${p.term}, governed by ${p.jurisdiction}.

PARTICIPANT SIGNATURE:
_______________________________________
${p.partyB}`,
  },
  // 18. Family
  {
    id: 'last-will-outline',
    categoryId: 'family',
    title: 'Simple Will & Asset Distribution Outline',
    summary: 'Last will outline specifying primary beneficiaries, executor appointments, and personal asset distribution.',
    defaultPartyA: 'Edward Vance ("Testator")',
    defaultPartyB: 'Katherine Vance ("Primary Beneficiary / Executor")',
    defaultScope: 'Distribution of Personal Assets, Real Property & Accounts',
    defaultAmount: 'Residuary Estate in Equal Shares to Named Heirs',
    defaultTerm: 'Revocable During Lifetime of Testator',
    defaultJurisdiction: 'State of Virginia, USA',
    bodyGenerator: (p) => `LAST WILL AND TESTAMENT OUTLINE

Testator: ${p.partyA}
Date: ${p.date}

I, ${p.partyA}, being of sound mind and memory, do hereby make, publish, and declare this instrument to be my Last Will and Testament.

1. APPOINTMENT OF EXECUTOR
I hereby appoint ${p.partyB} as the Executor of this my Last Will.

2. DISPOSITION OF PROPERTY
I direct that my assets be distributed according to the following directives: ${p.scope} (${p.amount}).

3. GOVERNING JURISDICTION
This instrument shall be probated under the laws of ${p.jurisdiction}.

TESTATOR:
_______________________________________
${p.partyA}

WITNESSES:
_______________________________________          _______________________________________
Witness 1 Signature                             Witness 2 Signature`,
  },
];

export const BusinessTemplates: React.FC = () => {
  const [selectedCatId, setSelectedCatId] = useState<string>('legal');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('contractor-agreement');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Form customizer inputs
  const currentTemplate = useMemo(() => {
    return TEMPLATES_CATALOG.find((t) => t.id === selectedTemplateId) || TEMPLATES_CATALOG[0];
  }, [selectedTemplateId]);

  const [partyA, setPartyA] = useState(currentTemplate.defaultPartyA);
  const [partyB, setPartyB] = useState(currentTemplate.defaultPartyB);
  const [effectiveDate, setEffectiveDate] = useState('2026-10-24');
  const [scope, setScope] = useState(currentTemplate.defaultScope);
  const [amount, setAmount] = useState(currentTemplate.defaultAmount);
  const [term, setTerm] = useState(currentTemplate.defaultTerm);
  const [jurisdiction, setJurisdiction] = useState(currentTemplate.defaultJurisdiction);

  // Switch template handler
  const handleSelectTemplate = (t: FormTemplateItem) => {
    setSelectedTemplateId(t.id);
    setSelectedCatId(t.categoryId);
    setPartyA(t.defaultPartyA);
    setPartyB(t.defaultPartyB);
    setScope(t.defaultScope);
    setAmount(t.defaultAmount);
    setTerm(t.defaultTerm);
    setJurisdiction(t.defaultJurisdiction);
  };

  // Filtered catalog
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return TEMPLATES_CATALOG.filter((t) => {
      const matchCat = selectedCatId === 'all' || t.categoryId === selectedCatId;
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.categoryId.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [selectedCatId, searchQuery]);

  // Document Text Generation
  const documentBody = useMemo(() => {
    return currentTemplate.bodyGenerator({
      partyA,
      partyB,
      date: effectiveDate,
      scope,
      amount,
      term,
      jurisdiction,
    });
  }, [currentTemplate, partyA, partyB, effectiveDate, scope, amount, term, jurisdiction]);

  // Export handlers
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageW, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(currentTemplate.title.toUpperCase(), 40, 36);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');

    const splitText = doc.splitTextToSize(documentBody, pageW - 80);
    doc.text(splitText, 40, 95);

    doc.save(`${currentTemplate.id}.pdf`);
  };

  const handleDownloadWord = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${currentTemplate.title}</title></head><body style="font-family:Calibri,Arial,sans-serif;white-space:pre-wrap;padding:36px;line-height:1.6;"><h2>${currentTemplate.title}</h2><hr/>${documentBody}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentTemplate.id}.doc`;
    a.click();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(documentBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<pre style="font-family:serif;font-size:13px;line-height:1.6;white-space:pre-wrap;padding:40px;">${documentBody}</pre>`);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  return (
    <div className="space-y-5">
      {/* Tool Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSignature className="w-5 h-5 text-indigo-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Forms & Legal Document Templates</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            11,000+ Curated Templates across 18 Categories
          </span>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Access over 11,000 expert-reviewed forms across 18 specialized categories including Legal Contracts, HR, Real Estate Leases, Finance, Medical Releases, Sales Proposals, NDAs, and Affidavits. Customize terms in real time and export to PDF or Word.
          </p>
        )}
      </div>

      {/* 18 Categories Scrollable Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Browse 18 Verified Categories:</span>
          <span>11,000+ Templates Library</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
              selectedCatId === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All 18 Categories
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75">({cat.countLabel})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Active Templates Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates (e.g. lease, nda, employment, loan, waiver)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Found {filteredTemplates.length} matching forms</span>
        </div>
      </div>

      {/* Main Dual Workspace: Form Editor on Left, Live Rendered Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Template Catalog & Interactive Fields */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Template Picker Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Choose Template Preset:</label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredTemplates.map((item) => {
                const active = item.id === selectedTemplateId;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTemplate(item)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                      active
                        ? 'bg-indigo-600/15 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{item.title}</span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.summary}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Form Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Customize Document Clauses
            </h4>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">First Party (Disclosing / Employer / Landlord)</label>
              <input
                type="text"
                value={partyA}
                onChange={(e) => setPartyA(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Second Party (Receiving / Employee / Tenant)</label>
              <input
                type="text"
                value={partyB}
                onChange={(e) => setPartyB(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Governing Jurisdiction</label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Purpose / Scope / Deliverables</label>
              <input
                type="text"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Financial Consideration / Fee</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Term & Duration</label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Real-Time Rendered Document Preview & Actions */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Live Formatted Preview</span>
              <span className="text-[10px] text-slate-400 font-normal">({currentTemplate.title})</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleDownloadWord}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Word (.doc)</span>
              </button>
              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[480px] max-h-[640px] overflow-y-auto shadow-2xl">
            <pre className="text-xs font-mono-code text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
              {documentBody}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
