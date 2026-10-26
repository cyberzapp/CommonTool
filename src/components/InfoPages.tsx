import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  HelpCircle,
  LifeBuoy,
  Building2,
  CheckCircle2,
  Search,
  Send,
  Cpu,
  Globe,
  Scale,
  Heart,
  Smartphone,
  Sparkles,
  Download,
  Mail,
  Coffee,
  Rocket,
  Award,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import {
  processRazorpayDonation,
  downloadDonationReceiptPdf,
  getDonationsHistory,
  type DonationRecord,
} from '../lib/razorpay';
import { logSupportTicketToFirestore } from '../lib/firebase';
import { TOOLS_CATALOG, type ToolId } from '../types/tools';

export type StaticPageId =
  | 'how-to-use'
  | 'donate'
  | 'about'
  | 'security'
  | 'privacy-policy'
  | 'terms-and-conditions'
  | 'faq'
  | 'help-and-support';

export const STATIC_PAGES_META: Record<
  StaticPageId,
  { path: string; label: string; seoTitle: string; seoDescription: string }
> = {
  'how-to-use': {
    path: '/how-to-use',
    label: 'How to Use',
    seoTitle: 'How to Use CommonTool — Step-by-Step Guides for All Workspace Utilities',
    seoDescription:
      'Step-by-step instructions, tips, and answers for using all client-side PDF, media, OCR, forms, AI translation, summarization, financial, and developer utilities.',
  },
  donate: {
    path: '/donate',
    label: 'Donate ❤️',
    seoTitle: 'Support CommonTool — Keep Free, Private Web Utilities Alive | Donate via Razorpay',
    seoDescription:
      'Support CommonTool with a heartfelt contribution via Razorpay. Help us keep all 18+ client-side tools 100% free, ad-free, and build our upcoming iOS and Android apps.',
  },
  about: {
    path: '/about',
    label: 'About Us',
    seoTitle: 'About CommonTool — Free Privacy-First Online Utility Platform',
    seoDescription:
      'Learn how CommonTool delivers 18 professional document, business, academic, and developer utilities for free using client-side browser technology.',
  },
  security: {
    path: '/security',
    label: 'Security',
    seoTitle: 'Security & Zero-Upload Architecture | CommonTool',
    seoDescription:
      'Discover how CommonTool processes PDFs, OCR scans, invoices, and media 100% inside your browser sandbox with zero file uploads to external servers.',
  },
  'privacy-policy': {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    seoTitle: 'Privacy Policy — Zero File Upload Guarantee | CommonTool',
    seoDescription:
      'Read the CommonTool Privacy Policy. Your PDFs, photos, financial figures, and notes stay on your device.',
  },
  'terms-and-conditions': {
    path: '/terms-and-conditions',
    label: 'Terms & Conditions',
    seoTitle: 'Terms & Conditions of Use | CommonTool',
    seoDescription:
      'Terms and conditions governing the use of CommonTool free online document, financial, academic, and productivity utilities.',
  },
  faq: {
    path: '/faq',
    label: 'FAQ',
    seoTitle: 'Frequently Asked Questions (FAQ) | CommonTool',
    seoDescription:
      'Answers to common questions about merging PDFs, client-side OCR, unbranded invoicing, citation formatting, offline PWA usage, and data privacy.',
  },
  'help-and-support': {
    path: '/help-and-support',
    label: 'Help & Support',
    seoTitle: 'Help Center, Documentation & Customer Support | CommonTool',
    seoDescription:
      'Get help with CommonTool utilities, browse troubleshooting guides, or email support@breathy.in and contact@breathy.in.',
  },
};

interface InfoPagesProps {
  pageId: StaticPageId;
  isDark: boolean;
  onNavigatePage: (page: StaticPageId, e?: React.MouseEvent) => void;
  onNavigateTool?: (id: ToolId, e?: React.MouseEvent) => void;
  initialGuideToolId?: ToolId | null;
}

const DONATION_TIERS = [
  {
    id: 'coffee',
    label: 'Buy Us a Chai / Coffee',
    inr: 199,
    usd: 5,
    icon: Coffee,
    desc: 'Covers a day of domain & CDN routing for thousands of students.',
  },
  {
    id: 'supporter',
    label: 'Community Supporter',
    inr: 499,
    usd: 15,
    icon: Heart,
    badge: 'Most Popular',
    desc: 'Helps maintain our WebAssembly PDF, OCR, and Media engines.',
  },
  {
    id: 'champion',
    label: 'Privacy Champion',
    inr: 999,
    usd: 25,
    icon: ShieldCheck,
    desc: 'Accelerates development of our upcoming native iOS & Android apps.',
  },
  {
    id: 'patron',
    label: 'Patron of Free Software',
    inr: 2499,
    usd: 50,
    icon: Award,
    desc: 'Sponsors free unbranded tools for classrooms, nonprofits, and freelancers.',
  },
];

export const InfoPages: React.FC<InfoPagesProps> = ({
  pageId,
  isDark,
  onNavigatePage,
  onNavigateTool,
  initialGuideToolId,
}) => {
  const [faqQuery, setFaqQuery] = useState('');
  const [selectedGuideToolId, setSelectedGuideToolId] = useState<ToolId>(
    initialGuideToolId || 'pdf-multitool'
  );

  // Support Form State
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportRecipient, setSupportRecipient] = useState<'both' | 'support@breathy.in' | 'contact@breathy.in'>('both');
  const [supportTopic, setSupportTopic] = useState('PDF & Document Utilities');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Donate / Razorpay State
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [selectedTierId, setSelectedTierId] = useState<string>('supporter');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [latestDonation, setLatestDonation] = useState<DonationRecord | null>(null);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>(() =>
    getDonationsHistory()
  );

  const cardClass = `rounded-2xl border p-6 sm:p-8 ${
    isDark
      ? 'bg-[#121215] border-zinc-800 text-zinc-100'
      : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
  }`;

  const subCardClass = `rounded-xl border p-5 ${
    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
  }`;

  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-600';
  const headingText = isDark ? 'text-white' : 'text-slate-900';

  const activeTier = DONATION_TIERS.find((t) => t.id === selectedTierId) || DONATION_TIERS[1];
  const effectiveAmount =
    selectedTierId === 'custom'
      ? Math.max(1, Number(customAmount) || (currency === 'INR' ? 250 : 10))
      : currency === 'INR'
      ? activeTier.inr
      : activeTier.usd;

  const handleRazorpayDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setIsPaying(true);

    const tierLabel =
      selectedTierId === 'custom' ? 'Custom Heartfelt Contribution' : activeTier.label;

    await processRazorpayDonation({
      amount: effectiveAmount,
      currency,
      donorName,
      donorEmail,
      message: donorMessage,
      tierLabel,
      onSuccess: (record) => {
        setIsPaying(false);
        setLatestDonation(record);
        setDonationHistory(getDonationsHistory());
      },
      onCancel: (reason) => {
        setIsPaying(false);
        if (reason && reason !== 'Payment window closed.') {
          setPaymentError(reason);
        }
      },
    });
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toAddress =
      supportRecipient === 'both'
        ? 'support@breathy.in,contact@breathy.in'
        : supportRecipient;
    void logSupportTicketToFirestore({
      name: supportName,
      email: supportEmail,
      recipient: toAddress,
      topic: supportTopic,
      message: supportMessage,
    });
    const subject = encodeURIComponent(`[CommonTool ${supportTopic}] Inquiry from ${supportName}`);
    const body = encodeURIComponent(
      `Name: ${supportName}\nEmail: ${supportEmail}\nCategory: ${supportTopic}\n\nMessage:\n${supportMessage}\n\n---\nSent via CommonTool Support Center`
    );
    window.location.href = `mailto:${toAddress}?subject=${subject}&body=${body}`;
    setSupportSubmitted(true);
  };

  const ALL_FAQS = [
    {
      category: 'Privacy & Security',
      q: 'Are my PDFs, images, or financial documents uploaded to your servers?',
      a: 'No. CommonTool is engineered on a strict Zero-Upload Client-Side architecture. When you select a PDF, HEIC photo, or spreadsheet, the file is read directly into your browser memory (ArrayBuffer) and processed locally on your CPU using WebAssembly and HTML5 Canvas.',
    },
    {
      category: 'Pricing & Donations',
      q: 'Is CommonTool really 100% free without watermarks or sign-up walls?',
      a: 'Yes! Because your own device performs the file processing, we keep server costs low and provide all 18 utilities — including unbranded PDF invoices and e-signatures — completely free. We are sustained by optional community donations on our Donate page.',
    },
    {
      category: 'Mobile Apps',
      q: 'Are native iOS and Android apps available?',
      a: 'Native iOS and Android apps are coming soon! Today, you can also click "Install App" in the top bar to install CommonTool as an offline-capable Progressive Web App (PWA) on iPhone, iPad, Android, Mac, and Windows.',
    },
    {
      category: 'Document Utilities',
      q: 'How do I merge, split, watermark, or e-sign a PDF on mobile or desktop?',
      a: 'Open the PDF Multi-Tool or PDF Watermark & Organizer suite. Select your PDF files, reorder pages if needed, draw your signature with your mouse or finger touch, and click Download to save the updated file immediately.',
    },
    {
      category: 'Business & Invoicing',
      q: 'Can I customize currencies and tax rates on invoices and receipts?',
      a: 'Yes. The Invoice & Receipt Generator supports USD ($), EUR (€), GBP (£), INR (₹), CAD (CA$), AUD (A$), and JPY (¥), along with customizable tax percentages, flat discounts, and saved reusable templates.',
    },
    {
      category: 'Contact & Support',
      q: 'How can I reach the CommonTool team for support or partnerships?',
      a: 'You can reach our technical support desk anytime at support@breathy.in or our general & partnership team at contact@breathy.in.',
    },
  ];

  const filteredFaqs = ALL_FAQS.filter(
    (item) =>
      !faqQuery.trim() ||
      item.q.toLowerCase().includes(faqQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(faqQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(faqQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar across all 7 informational pages */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-200 dark:border-zinc-800">
        {(Object.keys(STATIC_PAGES_META) as StaticPageId[]).map((id) => {
          const meta = STATIC_PAGES_META[id];
          const active = pageId === id;
          const isDonate = id === 'donate';
          return (
            <a
              key={id}
              href={meta.path}
              onClick={(e) => onNavigatePage(id, e)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                active
                  ? isDonate
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-950'
              }`}
            >
              {meta.label}
            </a>
          );
        })}
      </div>

      {/* 0A. HOW TO USE GUIDES PAGE */}
      {pageId === 'how-to-use' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={'lg:col-span-4 ' + cardClass + ' space-y-3'}>
            <h1 className={`text-base font-bold ${headingText}`}>Select a Tool Guide</h1>
            <p className={`text-xs ${mutedText}`}>
              Choose any of the 18 utilities below to view its step-by-step instructions and FAQs.
            </p>
            <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
              {TOOLS_CATALOG.map((t) => {
                const active = selectedGuideToolId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedGuideToolId(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : isDark
                        ? 'text-zinc-300 hover:bg-zinc-900'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{t.shortTitle}</span>
                    <span className={`text-[10px] ${active ? 'text-white/80' : mutedText}`}>
                      {t.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={'lg:col-span-8 ' + cardClass + ' space-y-6'}>
            {(() => {
              const guideTool =
                TOOLS_CATALOG.find((t) => t.id === selectedGuideToolId) || TOOLS_CATALOG[0];
              return (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
                    <div className="space-y-1 max-w-xl">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                        {guideTool.categoryLabel}
                      </span>
                      <h2 className={`text-xl font-bold ${headingText}`}>{guideTool.title}</h2>
                      <p className={`text-xs leading-relaxed ${mutedText}`}>
                        {guideTool.description}
                      </p>
                    </div>
                    {onNavigateTool && (
                      <a
                        href={guideTool.path}
                        onClick={(e) => onNavigateTool(guideTool.id, e)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shrink-0"
                      >
                        Open Tool →
                      </a>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className={`text-sm font-bold ${headingText}`}>
                      Step-by-Step Instructions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {guideTool.steps.map((step, i) => (
                        <div key={i} className={subCardClass + ' space-y-1.5'}>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                            {i + 1}
                          </span>
                          <p className={`text-xs leading-relaxed ${mutedText}`}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className={`text-sm font-bold ${headingText}`}>
                      Common Questions ({guideTool.shortTitle})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {guideTool.faqs.map((f, i) => (
                        <div key={i} className={subCardClass + ' space-y-1'}>
                          <p className={`text-xs font-bold ${headingText}`}>{f.question}</p>
                          <p className={`text-xs leading-relaxed ${mutedText}`}>{f.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 0. HEARTFELT DONATE PAGE (RAZORPAY INTEGRATED) */}
      {pageId === 'donate' && (
        <div className="space-y-6">
          {/* Heartfelt Hero Banner */}
          <div className={cardClass + ' space-y-5 relative overflow-hidden'}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                Community-Supported Free Software
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Smartphone className="w-3.5 h-3.5" />
                Coming Soon: Native iOS & Android Apps
              </span>
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${headingText}`}>
                Help Us Keep CommonTool 100% Free, Ad-Free, and Private for Everyone.
              </h1>
              <p className={`text-sm sm:text-base leading-relaxed ${mutedText}`}>
                Every day, students use CommonTool at 2 AM to format bibliographies and plot math equations, freelancers generate their first unbranded client invoices, and small business owners merge PDFs or sign NDAs—without ever hitting a paywall, watermark, or creepy data-harvesting upload server.
              </p>
              <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                We don’t sell your data, we don’t lock features behind $20/month subscriptions, and we don’t clutter your workspace with ads. If CommonTool has saved you time or money, please consider making a heartfelt contribution below. Every rupee or dollar goes directly toward maintaining this free service and building our <strong>upcoming native iOS & Android apps</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Razorpay Checkout Card */}
            <div className={'lg:col-span-7 ' + cardClass + ' space-y-5'}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-bold ${headingText}`}>
                    Make a Contribution via Razorpay
                  </h2>
                  <p className={`text-xs ${mutedText}`}>
                    Instant checkout supporting UPI, Google Pay, PhonePe, Cards & NetBanking
                  </p>
                </div>

                {/* Currency Toggle */}
                <div className="inline-flex rounded-xl p-1 border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900">
                  {(['INR', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrency(curr)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currency === curr
                          ? 'bg-indigo-600 text-white'
                          : isDark
                          ? 'text-zinc-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {curr === 'INR' ? '₹ INR' : '$ USD'}
                    </button>
                  ))}
                </div>
              </div>

              {latestDonation && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        Thank You from the Bottom of Our Hearts, {latestDonation.donorName}!
                      </span>
                      <p className={`text-xs ${mutedText}`}>
                        Your contribution of{' '}
                        <strong>
                          {latestDonation.currency === 'INR' ? '₹' : '$'}
                          {latestDonation.amount.toLocaleString()}
                        </strong>{' '}
                        ({latestDonation.tierLabel}) has been verified via Razorpay.
                      </p>
                      <p className="text-[11px] font-mono-code text-emerald-500">
                        Payment ID: {latestDonation.paymentId} • Order: {latestDonation.orderId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => downloadDonationReceiptPdf(latestDonation)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Official PDF Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setLatestDonation(null)}
                      className="px-3 py-2 rounded-xl border border-emerald-500/30 text-xs font-semibold text-emerald-500 cursor-pointer"
                    >
                      Make Another Contribution
                    </button>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Tier Selection Grid */}
              <form onSubmit={handleRazorpayDonate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DONATION_TIERS.map((tier) => {
                    const Icon = tier.icon;
                    const isSelected = selectedTierId === tier.id;
                    const price = currency === 'INR' ? `₹${tier.inr}` : `$${tier.usd}`;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTierId(tier.id)}
                        className={`text-left p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
                            : isDark
                            ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                            <Icon className="w-4 h-4 text-rose-500" />
                            <span className={headingText}>{tier.label}</span>
                          </span>
                          {tier.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed ${mutedText}`}>{tier.desc}</p>
                        <div className={`text-lg font-extrabold ${headingText}`}>{price}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Option */}
                <div
                  onClick={() => setSelectedTierId('custom')}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                    selectedTierId === 'custom'
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
                      : isDark
                      ? 'bg-zinc-900/60 border-zinc-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs font-bold ${headingText}`}>
                      Custom Contribution Amount ({currency === 'INR' ? '₹' : '$'})
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    placeholder={currency === 'INR' ? 'Enter ₹ amount (e.g. 750)' : 'Enter $ amount (e.g. 20)'}
                    value={customAmount}
                    onFocus={() => setSelectedTierId('custom')}
                    onChange={(e) => {
                      setSelectedTierId('custom');
                      setCustomAmount(e.target.value);
                    }}
                    className={`w-48 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Donor Details for Receipt & Razorpay Prefill */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${mutedText}`}>
                      Your Name (for Receipt)
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Alex Verma (or leave blank for Anonymous)"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-800 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${mutedText}`}>
                      Email Address (for Razorpay Receipt)
                    </label>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-800 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${mutedText}`}>
                    Leave an Encouragement Note or Feature Wish (Optional)
                  </label>
                  <input
                    type="text"
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    placeholder="e.g., Thank you for the free PDF & Invoice tools! Excited for the iOS app!"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  {isPaying
                    ? 'Opening Secure Razorpay Checkout...'
                    : `Donate ${currency === 'INR' ? '₹' : '$'}${effectiveAmount.toLocaleString()} Securely via Razorpay`}
                </button>

                <p className={`text-[11px] text-center ${mutedText}`}>
                  100% Secure Payment Managed by <strong>Razorpay</strong> • Instant Official PDF Receipt • Questions?{' '}
                  <a href="mailto:contact@breathy.in" className="text-indigo-500 hover:underline">
                    contact@breathy.in
                  </a>
                </p>
              </form>
            </div>

            {/* Right Column: Where Your Support Goes + Coming Soon Mobile Apps + Past Receipts */}
            <div className="lg:col-span-5 space-y-6">
              <div className={cardClass + ' space-y-4'}>
                <h3 className={`text-base font-bold flex items-center gap-2 ${headingText}`}>
                  <Rocket className="w-4 h-4 text-indigo-500" />
                  Where Your Contribution Goes
                </h3>
                <div className="space-y-3 text-xs">
                  <div className={subCardClass + ' space-y-1'}>
                    <p className={`font-bold ${headingText}`}>
                      1. Keeping All 18+ Utilities 100% Free & Unbranded
                    </p>
                    <p className={mutedText}>
                      Zero watermarks on your invoices, PDFs, legal agreements, and QR codes—forever.
                    </p>
                  </div>
                  <div className={subCardClass + ' space-y-1'}>
                    <p className={`font-bold flex items-center gap-1.5 ${headingText}`}>
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                      2. Coming Soon: Native iOS & Android Apps
                    </p>
                    <p className={mutedText}>
                      We are actively building dedicated offline-first iOS (App Store) and Android (Google Play) mobile apps with native document scanning and share-sheet extensions.
                    </p>
                  </div>
                  <div className={subCardClass + ' space-y-1'}>
                    <p className={`font-bold ${headingText}`}>
                      3. High-Speed WebAssembly & Global CDN
                    </p>
                    <p className={mutedText}>
                      Maintaining our client-side PDF, OCR, and media engines and fast global asset delivery.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                  <p className={`font-bold ${headingText}`}>Direct Contact & Sponsorships</p>
                  <p className={mutedText}>
                    Email us at{' '}
                    <a href="mailto:contact@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                      contact@breathy.in
                    </a>{' '}
                    or{' '}
                    <a href="mailto:support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                      support@breathy.in
                    </a>
                  </p>
                </div>
              </div>

              {donationHistory.length > 0 && (
                <div className={cardClass + ' space-y-3'}>
                  <h3 className={`text-sm font-bold ${headingText}`}>
                    Your Contribution Receipts ({donationHistory.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {donationHistory.map((item) => (
                      <div
                        key={item.id + item.paymentId}
                        className={subCardClass + ' flex items-center justify-between gap-2 text-xs'}
                      >
                        <div>
                          <p className={`font-bold ${headingText}`}>
                            {item.currency === 'INR' ? '₹' : '$'}
                            {item.amount.toLocaleString()} — {item.tierLabel}
                          </p>
                          <p className={`text-[11px] font-mono-code ${mutedText}`}>
                            {item.paymentId} • {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadDonationReceiptPdf(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold cursor-pointer shrink-0"
                        >
                          PDF Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. ABOUT US */}
      {pageId === 'about' && (
        <div className={cardClass + ' space-y-6'}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500">
                <Building2 className="w-4 h-4" />
                About CommonTool
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Smartphone className="w-3 h-3" />
                Coming Soon: iOS & Android Apps
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
              Professional Everyday Software, Built to Run Privately on Your Device.
            </h1>
            <p className={`text-sm leading-relaxed ${mutedText}`}>
              CommonTool was created with a simple belief: you should not have to upload sensitive contracts, tax receipts, or personal photos to an unknown remote server—or pay a monthly subscription—just to merge a PDF, generate an invoice, convert an image, or format a bibliography.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={subCardClass + ' space-y-2'}>
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h3 className={`text-sm font-bold ${headingText}`}>100% Client-Side Engine</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                Powered by modern WebAssembly (Wasm), Web Audio, Web Crypto, and HTML5 Canvas APIs so every tool runs locally at native speed.
              </p>
            </div>
            <div className={subCardClass + ' space-y-2'}>
              <Lock className="w-5 h-5 text-emerald-500" />
              <h3 className={`text-sm font-bold ${headingText}`}>Privacy by Default</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                Zero mandatory sign-ups, zero tracking watermarks, and zero server-side file storage. Your files never leave your computer or phone.
              </p>
            </div>
            <div className={subCardClass + ' space-y-2'}>
              <Globe className="w-5 h-5 text-sky-500" />
              <h3 className={`text-sm font-bold ${headingText}`}>18 Unified Workbenches + Mobile Apps</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                18 web workbenches available today as an installable PWA, with native iOS and Android apps coming soon.
              </p>
            </div>
          </div>

          {/* Founder & Engineering Leadership Section (E-E-A-T & Google Entity Recognition) */}
          <div className={`${subCardClass} p-6 border-l-4 border-l-indigo-500 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-500 text-lg">
                  SD
                </div>
                <div>
                  <h3 className={`text-base font-bold ${headingText}`}>Suman Das</h3>
                  <p className={`text-xs ${mutedText}`}>Founder & Lead System Architect • Breathy & CommonTool</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Award className="w-3.5 h-3.5" />
                Global Gold Standard for Client-Side Security
              </span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
              CommonTool was envisioned and architected by Suman Das to establish an uncompromising international benchmark for document privacy and file sovereignty. By compiling high-performance native engines into WebAssembly, CommonTool processes PDFs, OCR computer vision, audio streams, and financial calculations entirely inside the client’s local browser memory. Zero telemetry, zero cloud file storage, and zero document uploads—providing professionals, legal departments, students, and businesses worldwide with the gold standard in privacy.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <a
                href="https://github.com/cyberzapp"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-500 hover:underline flex items-center gap-1"
              >
                GitHub Profile (@cyberzapp) ↗
              </a>
              <span className={mutedText}>•</span>
              <a
                href="https://commontool.breathy.in"
                className="text-indigo-500 hover:underline flex items-center gap-1"
              >
                Official Domain: commontool.breathy.in ↗
              </a>
              <span className={mutedText}>•</span>
              <a
                href="mailto:contact@breathy.in"
                className="text-indigo-500 hover:underline flex items-center gap-1"
              >
                contact@breathy.in ↗
              </a>
            </div>
          </div>

          <div className={subCardClass + ' flex flex-wrap items-center justify-between gap-4'}>
            <div className="space-y-1">
              <h3 className={`text-sm font-bold ${headingText}`}>Get in Touch with Our Team</h3>
              <p className={`text-xs ${mutedText}`}>
                General inquiries & partnerships:{' '}
                <a href="mailto:contact@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  contact@breathy.in
                </a>{' '}
                • Technical support:{' '}
                <a href="mailto:support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  support@breathy.in
                </a>
              </p>
            </div>
            <a
              href="/donate"
              onClick={(e) => onNavigatePage('donate', e)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              Support CommonTool
            </a>
          </div>
        </div>
      )}

      {/* 2. SECURITY */}
      {pageId === 'security' && (
        <div className={cardClass + ' space-y-6'}>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
              Security & Architecture Whitepaper
            </span>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
              Zero-Upload Browser Sandbox Architecture
            </h1>
            <p className={`text-sm leading-relaxed ${mutedText}`}>
              Traditional online utilities upload your documents to remote cloud buckets where they may be logged, cached, or exposed. CommonTool eliminates server-side file exposure entirely by executing all file transformations inside your browser’s isolated memory sandbox.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={subCardClass + ' space-y-2'}>
              <h3 className={`text-sm font-bold ${headingText}`}>1. Local In-Memory File Processing</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                All PDF merges, splits, watermarks, e-signatures, HEIC photo conversions, and OCR scans operate on local JavaScript <code>Uint8Array</code> buffers. When you close the browser tab, memory is immediately freed by the browser garbage collector.
              </p>
            </div>
            <div className={subCardClass + ' space-y-2'}>
              <h3 className={`text-sm font-bold ${headingText}`}>2. Cryptographic Randomness (CSPRNG)</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                Password generation, UUID v4 creation, and SHA-256 hashing utilize the native browser <code>window.crypto.getRandomValues()</code> and <code>crypto.subtle</code> Web Crypto APIs.
              </p>
            </div>
            <div className={subCardClass + ' space-y-2'}>
              <h3 className={`text-sm font-bold ${headingText}`}>3. Owner-Scoped Cloud Sync (Optional)</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                If you optionally sign in to back up notes or invoice templates, data is transmitted over TLS 1.3 to Google Cloud Firestore and protected by strict owner-only Security Rules (<code>request.auth.uid == userId</code>).
              </p>
            </div>
            <div className={subCardClass + ' space-y-2'}>
              <h3 className={`text-sm font-bold ${headingText}`}>4. Vulnerability Disclosure & Contact</h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                To report a security question or request a compliance review, contact our security desk at{' '}
                <a href="mailto:support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  support@breathy.in
                </a>{' '}
                or{' '}
                <a href="mailto:contact@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  contact@breathy.in
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRIVACY POLICY */}
      {pageId === 'privacy-policy' && (
        <div className={cardClass + ' space-y-5'}>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500">
              <Lock className="w-4 h-4" />
              Effective Date: October 23, 2026
            </span>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
              Privacy Policy
            </h1>
          </div>

          <div className={`space-y-4 text-xs sm:text-sm leading-relaxed ${mutedText}`}>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                1. Zero Collection of User Files & Documents
              </h3>
              <p>
                CommonTool does not upload, transmit, store, or inspect any PDF documents, images, audio/video files, spreadsheets, or text snippets that you process within our browser utilities. All file operations occur locally on your device.
              </p>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                2. LocalStorage & Browser Persistence
              </h3>
              <p>
                Tools such as the Quick Scratchpad, Priority Checklist, Saved Invoice Templates, and Theme Preference store state inside your browser’s native <code>localStorage</code> so your work is preserved across page refreshes. You may clear your browser storage at any time.
              </p>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                3. Optional Cloud Sync & Donations
              </h3>
              <p>
                Creating an account is completely optional. If you use Cloud Sync, we store only your authentication identifier and the workspace JSON state you explicitly push to Firebase Cloud Firestore. Donations are processed securely through Razorpay without storing raw card or banking credentials on CommonTool.
              </p>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                4. Privacy Contact
              </h3>
              <p>
                For any privacy-related questions or data requests, email us at{' '}
                <a href="mailto:privacy@breathy.in?cc=contact@breathy.in,support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  contact@breathy.in
                </a>{' '}
                or{' '}
                <a href="mailto:support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  support@breathy.in
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. TERMS & CONDITIONS */}
      {pageId === 'terms-and-conditions' && (
        <div className={cardClass + ' space-y-5'}>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500">
              <Scale className="w-4 h-4" />
              Last Updated: October 23, 2026
            </span>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
              Terms & Conditions
            </h1>
          </div>

          <div className={`space-y-4 text-xs sm:text-sm leading-relaxed ${mutedText}`}>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                1. Acceptance of Terms & License
              </h3>
              <p>
                By accessing or using CommonTool, you agree to these Terms. CommonTool grants you a free, worldwide, non-exclusive, royalty-free license to use all utilities for personal, academic, and commercial purposes.
              </p>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                2. Full Ownership of Generated Output
              </h3>
              <p>
                You retain 100% ownership and copyright of all PDFs, invoices, receipts, legal agreements, QR codes, and documents you create or process using CommonTool. Exported documents contain zero watermarks or attribution requirements.
              </p>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                3. No Legal or Financial Advice Disclaimer
              </h3>
              <p>
                The Business Document Templates (NDAs, Service Agreements, Offer Letters, Quotations) and Financial Calculators are provided for informational and operational convenience only and do not constitute formal legal, tax, or investment advice.
              </p>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${headingText}`}>
                4. Contact Information
              </h3>
              <p>
                Questions regarding these Terms may be directed to{' '}
                <a href="mailto:contact@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  contact@breathy.in
                </a>{' '}
                and{' '}
                <a href="mailto:support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                  support@breathy.in
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. FAQ */}
      {pageId === 'faq' && (
        <div className={cardClass + ' space-y-6'}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500">
                <HelpCircle className="w-4 h-4" />
                Knowledge Base
              </span>
              <h1 className={`text-2xl font-bold tracking-tight mt-1 ${headingText}`}>
                Frequently Asked Questions
              </h1>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Search FAQ topics..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFaqs.map((item, idx) => (
              <div key={idx} className={subCardClass + ' space-y-2'}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  {item.category}
                </span>
                <h3 className={`text-sm font-bold ${headingText}`}>{item.q}</h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. HELP & SUPPORT */}
      {pageId === 'help-and-support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={'lg:col-span-7 ' + cardClass + ' space-y-5'}>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500">
                <LifeBuoy className="w-4 h-4" />
                Help & Support Center
              </span>
              <h1 className={`text-2xl font-bold tracking-tight ${headingText}`}>
                Direct Contact & Troubleshooting Guides
              </h1>
            </div>

            {/* Direct Email Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="mailto:support@breathy.in?subject=CommonTool%20Support%20Request"
                className={subCardClass + ' flex items-start gap-3 hover:border-indigo-500 transition'}
              >
                <Mail className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className={`text-xs font-bold ${headingText}`}>Technical Support Desk</p>
                  <p className="text-xs font-semibold text-indigo-500">support@breathy.in</p>
                  <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                    Bug reports, Cloud Sync help & tool troubleshooting
                  </p>
                </div>
              </a>

              <a
                href="mailto:contact@breathy.in?subject=CommonTool%20General%20Inquiry"
                className={subCardClass + ' flex items-start gap-3 hover:border-indigo-500 transition'}
              >
                <Mail className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className={`text-xs font-bold ${headingText}`}>General & Partnerships</p>
                  <p className="text-xs font-semibold text-emerald-500">contact@breathy.in</p>
                  <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                    Feature requests, feedback, donations & business inquiries
                  </p>
                </div>
              </a>
            </div>

            <div className="space-y-3">
              <div className={subCardClass + ' space-y-1.5'}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Large PDF or Media Processing Tips
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  Because files are processed in browser RAM, we recommend processing PDFs under 200 MB on mobile devices and up to 500 MB on desktop browsers for instant responsiveness.
                </p>
              </div>
              <div className={subCardClass + ' space-y-1.5'}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Improving OCR Accuracy on Receipts & Notes
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  Keep the "Auto Contrast & Adaptive Binarization" toggle enabled in the OCR Scanner when scanning low-light phone photos of paper receipts or handwritten notes.
                </p>
              </div>
              <div className={subCardClass + ' space-y-1.5'}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                  <Smartphone className="w-4 h-4 text-sky-500" />
                  Coming Soon: Native iOS & Android Apps
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  Native iOS and Android apps are in active development. In the meantime, click "Install App" in the header to install the offline PWA on your phone or desktop.
                </p>
              </div>
            </div>
          </div>

          <div className={'lg:col-span-5 ' + cardClass + ' space-y-4'}>
            <h2 className={`text-base font-bold ${headingText}`}>
              Send Message to Support & Contact Team
            </h2>
            <p className={`text-xs ${mutedText}`}>
              All messages are routed directly to{' '}
              <a href="mailto:support@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                support@breathy.in
              </a>{' '}
              and{' '}
              <a href="mailto:contact@breathy.in" className="text-indigo-500 font-semibold hover:underline">
                contact@breathy.in
              </a>
              .
            </p>

            {supportSubmitted ? (
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 space-y-2.5 text-xs">
                <p className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Email Dispatched to Our Team!
                </p>
                <p>
                  Thank you, {supportName || 'friend'}! Your email client has been opened addressed to{' '}
                  <strong>contact@breathy.in</strong> & <strong>support@breathy.in</strong>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={`mailto:support@breathy.in,contact@breathy.in?subject=${encodeURIComponent(
                      `[CommonTool ${supportTopic}] ${supportName}`
                    )}&body=${encodeURIComponent(supportMessage)}`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                  >
                    Re-open Email Client
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSupportSubmitted(false);
                      setSupportMessage('');
                    }}
                    className="underline font-semibold cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-3">
                <div>
                  <label className={`block text-xs mb-1 ${mutedText}`}>Recipient Department</label>
                  <select
                    value={supportRecipient}
                    onChange={(e) =>
                      setSupportRecipient(
                        e.target.value as 'both' | 'support@breathy.in' | 'contact@breathy.in'
                      )
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="both">Both (support@breathy.in & contact@breathy.in)</option>
                    <option value="support@breathy.in">Technical Support (support@breathy.in)</option>
                    <option value="contact@breathy.in">General & Contact (contact@breathy.in)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${mutedText}`}>Your Name</label>
                  <input
                    type="text"
                    required
                    value={supportName}
                    onChange={(e) => setSupportName(e.target.value)}
                    placeholder="Alex Morgan"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${mutedText}`}>Your Email Address</label>
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${mutedText}`}>Category</label>
                  <select
                    value={supportTopic}
                    onChange={(e) => setSupportTopic(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option>PDF & Document Utilities</option>
                    <option>Invoicing & Financial Calculators</option>
                    <option>Academic, Citations & Math</option>
                    <option>Cloud Sync & Account Support</option>
                    <option>Donation / Sponsorship Inquiry</option>
                    <option>New Free Tool Suggestion</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${mutedText}`}>How can we help?</label>
                  <textarea
                    rows={4}
                    required
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your question or feature request..."
                    className={`w-full rounded-xl border p-3 text-xs ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send to support@breathy.in & contact@breathy.in
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
