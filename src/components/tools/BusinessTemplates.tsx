import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileSignature,
  Download,
  Copy,
  CheckCircle2,
  FileText,
  Info,
} from 'lucide-react';

type TemplateType = 'nda' | 'service-agreement' | 'quotation' | 'offer-letter';

export const BusinessTemplates: React.FC = () => {
  const [templateType, setTemplateType] = useState<TemplateType>('nda');
  const [effectiveDate, setEffectiveDate] = useState('2026-10-23');
  const [partyA, setPartyA] = useState('Apex Technologies Inc.');
  const [partyB, setPartyB] = useState('Nova Consulting Group LLC');
  const [jurisdiction, setJurisdiction] = useState('State of Delaware, USA');
  const [roleOrScope, setRoleOrScope] = useState('Senior Principal Cloud Architect');
  const [compensationOrFee, setCompensationOrFee] = useState('$165,000 USD Base Salary + Equity');
  const [durationOrValidity, setDurationOrValidity] = useState('3 Years Confidentiality Term');
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const selectPreset = (type: TemplateType) => {
    setTemplateType(type);
    if (type === 'nda') {
      setRoleOrScope('Proprietary Product Roadmap, Source Code & Financial Models');
      setCompensationOrFee('Mutual Non-Disclosure Protection');
      setDurationOrValidity('3 Years from Effective Date');
    } else if (type === 'service-agreement') {
      setRoleOrScope('Custom Software Engineering, Cloud Migration & QA Automation');
      setCompensationOrFee('$18,500 USD (50% Upfront, 50% Upon Delivery)');
      setDurationOrValidity('Net-15 Payment Terms • Full IP Assignment Upon Payment');
    } else if (type === 'quotation') {
      setRoleOrScope('Enterprise SaaS Platform Implementation + 12 Months Priority SLA');
      setCompensationOrFee('$24,800 USD Total Quoted Investment');
      setDurationOrValidity('Quote Valid for 30 Calendar Days');
    } else if (type === 'offer-letter') {
      setRoleOrScope('Lead Full-Stack Engineer (Remote / Hybrid)');
      setCompensationOrFee('$165,000 USD Annual Base + 15% Performance Bonus');
      setDurationOrValidity('Full-Time At-Will Employment • Comprehensive Benefits');
    }
  };

  const buildDocumentText = (): { title: string; body: string } => {
    if (templateType === 'nda') {
      return {
        title: 'MUTUAL NON-DISCLOSURE AGREEMENT (NDA)',
        body: `THIS MUTUAL NON-DISCLOSURE AGREEMENT ("Agreement") is entered into as of ${effectiveDate} ("Effective Date"), by and between ${partyA} ("First Party") and ${partyB} ("Second Party").

1. PURPOSE OF DISCLOSURE
The parties wish to explore a business opportunity of mutual interest regarding: ${roleOrScope}. In connection with this opportunity, each party may disclose certain confidential technical and business information to the other party.

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public data, source code, algorithms, trade secrets, customer lists, financial projections, or product designs disclosed orally or in writing by either party.

3. OBLIGATIONS OF RECEIVING PARTY
Each Receiving Party agrees to: (a) hold the Disclosing Party's Confidential Information in strict confidence; (b) not disclose such Confidential Information to any third party without prior written consent; and (c) use the Confidential Information solely for evaluating the Purpose.

4. TERM & RETURN OF MATERIALS
This Agreement and the confidentiality obligations herein shall remain in effect for ${durationOrValidity}. Upon written request, all Confidential Information shall be promptly returned or destroyed.

5. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the ${jurisdiction}.

IN WITNESS WHEREOF, the parties have executed this Mutual Non-Disclosure Agreement as of the Effective Date.

_______________________________          _______________________________
${partyA}                                ${partyB}
Authorized Signature                     Authorized Signature`,
      };
    }

    if (templateType === 'service-agreement') {
      return {
        title: 'MASTER PROFESSIONAL SERVICES AGREEMENT',
        body: `THIS MASTER SERVICE AGREEMENT ("Agreement") is made effective as of ${effectiveDate}, between ${partyA} ("Service Provider") and ${partyB} ("Client").

1. SCOPE OF SERVICES
Service Provider agrees to perform the following professional deliverables:
${roleOrScope}

2. COMPENSATION & PAYMENT SCHEDULE
In consideration for the Services, Client shall pay Service Provider:
${compensationOrFee}
Terms: ${durationOrValidity}

3. INTELLECTUAL PROPERTY RIGHTS
Upon receipt of full payment, Service Provider assigns to Client all right, title, and interest in and to the custom deliverables created specifically for Client under this Agreement.

4. WARRANTIES & LIMITATION OF LIABILITY
Service Provider warrants that all services will be performed in a professional and workmanlike manner. Neither party shall be liable for indirect, incidental, or consequential damages.

5. GOVERNING LAW
This Agreement shall be governed by the laws of the ${jurisdiction}.

ACCEPTED AND AGREED:

_______________________________          _______________________________
${partyA} (Provider)                     ${partyB} (Client)`,
      };
    }

    if (templateType === 'quotation') {
      return {
        title: 'OFFICIAL COMMERCIAL QUOTATION SHEET',
        body: `PREPARED BY: ${partyA}
PREPARED FOR: ${partyB}
DATE ISSUED: ${effectiveDate}
VALIDITY: ${durationOrValidity}

1. EXECUTIVE PROJECT SUMMARY & DELIVERABLES
${roleOrScope}

2. COMMERCIAL INVESTMENT SUMMARY
Quoted Package Total: ${compensationOrFee}
• Includes full system deployment, documentation, and handoff training.
• Applicable taxes (GST/VAT/Sales Tax) calculated upon formal invoicing.

3. NEXT STEPS & ACCEPTANCE
To accept this quotation and lock in project scheduling, please sign below and return a copy prior to the expiration window (${durationOrValidity}).

4. JURISDICTION & STANDARD TERMS
Subject to standard commercial terms under the laws of the ${jurisdiction}.

QUOTATION APPROVED BY CLIENT:

_______________________________          Date: ___________________
Authorized Representative — ${partyB}`,
      };
    }

    return {
      title: 'EMPLOYMENT OFFER LETTER',
      body: `Date: ${effectiveDate}

Dear ${partyB},

On behalf of ${partyA} ("Company"), we are thrilled to offer you the position of ${roleOrScope}!

1. POSITION & START TERMS
You will report directly to the Engineering & Operations Leadership Team. Terms: ${durationOrValidity}.

2. COMPENSATION & BENEFITS PACKAGE
Your compensation package will include:
• ${compensationOrFee}
• Paid Time Off (PTO), health & wellness coverage, and equipment stipend.

3. CONFIDENTIALITY & AT-WILL STATUS
Your employment with ${partyA} is at-will and subject to signing our standard Employee Proprietary Information and Inventions Agreement, governed by the laws of the ${jurisdiction}.

We look forward to building the future together. Please indicate your acceptance of this offer by signing below.

Sincerely,

_______________________________
Hiring Executive, ${partyA}

CANDIDATE ACCEPTANCE:
I accept the offer of employment as outlined above.

_______________________________          Date: ___________________
${partyB}`,
    };
  };

  const { title, body } = buildDocumentText();

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 50, 60);

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1.5);
    doc.line(50, 72, pageW - 50, 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    const wrapped = doc.splitTextToSize(body, pageW - 100);
    doc.text(wrapped, 50, 100);
    doc.save(`CommonTool-${templateType.toUpperCase()}-${effectiveDate}.pdf`);
  };

  const exportWord = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Georgia,serif;padding:40px;line-height:1.6;"><h1>${title}</h1><pre style="font-family:Georgia,serif;white-space:pre-wrap;">${body}</pre></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CommonTool-${templateType.toUpperCase()}-${effectiveDate}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSignature className="w-5 h-5 text-blue-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Business Document Templates</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="About this tool"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Export .DOC
            </button>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Instant NDAs, Master Service Agreements, Quotation Sheets, and Employment Offer Letters with live contract preview and PDF/Word export.
          </p>
        )}
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: 'nda', label: 'Mutual / Unilateral NDA', sub: 'Confidentiality & IP Protection' },
          { id: 'service-agreement', label: 'Service Agreement', sub: 'Freelance & Agency Contracts' },
          { id: 'quotation', label: 'Price Quotation Sheet', sub: 'Commercial Proposal & Estimate' },
          { id: 'offer-letter', label: 'Employment Offer Letter', sub: 'Full-Time / Contractor Hire' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => selectPreset(t.id as TemplateType)}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              templateType === t.id
                ? 'bg-blue-500/20 border-blue-500/50 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <p className="text-sm font-bold">{t.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Document Variables</h3>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Effective / Issue Date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {templateType === 'offer-letter' ? 'Hiring Company Name' : 'First Party / Provider Name'}
            </label>
            <input
              type="text"
              value={partyA}
              onChange={(e) => setPartyA(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {templateType === 'offer-letter' ? 'Candidate Full Name' : 'Second Party / Client Name'}
            </label>
            <input
              type="text"
              value={partyB}
              onChange={(e) => setPartyB(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Scope / Role / Purpose</label>
            <textarea
              rows={2}
              value={roleOrScope}
              onChange={(e) => setRoleOrScope(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Compensation / Quoted Fee / Protection</label>
            <input
              type="text"
              value={compensationOrFee}
              onChange={(e) => setCompensationOrFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Term / Validity / Payment Schedule</label>
            <input
              type="text"
              value={durationOrValidity}
              onChange={(e) => setDurationOrValidity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Governing Law / Jurisdiction</label>
            <input
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
        </div>

        {/* Live Legal Preview */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{title}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${title}\n\n${body}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-200 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <pre className="flex-1 whitespace-pre-wrap rounded-xl bg-white text-slate-900 p-6 text-xs leading-relaxed font-serif shadow-inner overflow-auto max-h-[540px]">
            {body}
          </pre>
        </div>
      </div>
    </div>
  );
};
