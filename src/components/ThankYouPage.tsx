import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  CheckCircle2,
  Download,
  Share2,
  Linkedin,
  Twitter,
  MessageCircle,
  Facebook,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  CreditCard,
  User,
  Mail,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  getLatestDonation,
  downloadDonationReceiptPdf,
  checkAndRecoverRedirectDonation,
  type DonationRecord,
} from '../lib/razorpay';
import { subscribeNewsletterToFirestore } from '../lib/firebase';
import type { ToolId } from '../types/tools';

interface ThankYouPageProps {
  isDark: boolean;
  onNavigatePage: (page: string) => void;
  onNavigateTool?: (toolId: ToolId) => void;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({
  isDark,
  onNavigatePage,
  onNavigateTool,
}) => {
  const [donation, setDonation] = useState<DonationRecord | null>(() => getLatestDonation());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPaymentId, setCopiedPaymentId] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);
  const autoDownloadedRef = useRef(false);

  useEffect(() => {
    // If not loaded in initial state, recover redirect parameters or latest donation
    if (!donation) {
      void checkAndRecoverRedirectDonation().then((recovered) => {
        if (recovered) {
          setDonation(recovered);
        } else {
          const latest = getLatestDonation();
          if (latest) setDonation(latest);
        }
      });
    }
  }, [donation]);

  useEffect(() => {
    // Automatically trigger receipt download once on initial entry
    if (donation && !autoDownloadedRef.current) {
      autoDownloadedRef.current = true;
      const timer = setTimeout(() => {
        try {
          downloadDonationReceiptPdf(donation);
        } catch {
          // Ignore automatic trigger failure
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [donation]);

  const cardClass = `rounded-2xl border p-4 sm:p-6 md:p-8 ${
    isDark
      ? 'bg-[#121215] border-zinc-800 text-zinc-100'
      : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
  }`;

  const subCardClass = `rounded-xl border p-4 sm:p-5 ${
    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
  }`;

  const headingText = isDark ? 'text-white' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-600';

  const shareUrl = 'https://commontool.breathy.in';
  const shareText = `I just contributed to keep CommonTool 100% free, private, and zero-upload! Built by Suman Das (@cyberzapp). Check it out:`;

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl
  )}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText} ${shareUrl}`
  )}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyPaymentId = (pid: string) => {
    void navigator.clipboard.writeText(pid);
    setCopiedPaymentId(true);
    setTimeout(() => setCopiedPaymentId(false), 2200);
  };

  const handleManualDownloadReceipt = () => {
    if (donation) {
      downloadDonationReceiptPdf(donation);
    }
  };

  const formattedAddress = donation?.billingAddress
    ? [
        donation.billingAddress.street,
        donation.billingAddress.city,
        donation.billingAddress.state,
        donation.billingAddress.postalCode,
        donation.billingAddress.country,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Not specified';

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
      {/* 1. Gratitude Hero Card */}
      <div className={cardClass + ' text-center space-y-5 sm:p-8 md:p-10 relative overflow-hidden'}>
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-md mx-auto shrink-0">
          <Heart className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 fill-rose-500 animate-pulse" />
        </div>

        <div className="space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Verified Contribution via Razorpay
          </div>

          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight ${headingText}`}>
            Thank You, {donation?.donorName || 'Supporter'}!
          </h1>

          <p className={`text-sm sm:text-base leading-relaxed ${mutedText}`}>
            Your contribution of{' '}
            <strong className="text-emerald-500 font-bold">
              {donation?.currency === 'INR' ? '₹' : '$'}
              {(donation?.amount || 250).toLocaleString()}
            </strong>{' '}
            keeps all 18+ CommonTool utilities 100% free, private, and unbranded for students,
            freelancers, and creators worldwide.
          </p>

          <p className="text-xs text-slate-400">
            An official PDF receipt has been generated locally in your browser.
          </p>
        </div>

        {/* Primary Download Receipt Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleManualDownloadReceipt}
            className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[46px] rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/25 transition-all active:scale-95 touch-manipulation cursor-pointer shrink-0"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span>Download Official PDF Receipt</span>
          </button>

          <button
            onClick={() => onNavigatePage('donate')}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[46px] rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer touch-manipulation ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>View All Contributions</span>
          </button>
        </div>
      </div>

      {/* 2. Official Audit & Transaction Summary */}
      {donation && (
        <div className={cardClass + ' space-y-4'}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <h2 className={`text-base font-bold ${headingText}`}>Contribution Receipt Breakdown</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`${subCardClass} space-y-1`}>
              <span className="text-slate-400 block font-medium">Receipt Identifier</span>
              <p className={`font-mono font-bold text-sm ${headingText}`}>{donation.id}</p>
            </div>

            <div className={`${subCardClass} space-y-1`}>
              <span className="text-slate-400 block font-medium">Date & Time</span>
              <p className={`font-semibold ${headingText}`}>
                {new Date(donation.createdAt).toLocaleString()}
              </p>
            </div>

            <div className={`${subCardClass} space-y-1`}>
              <span className="text-slate-400 block font-medium">Razorpay Payment ID</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-indigo-500 font-semibold truncate">
                  {donation.paymentId}
                </span>
                <button
                  onClick={() => handleCopyPaymentId(donation.paymentId)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer shrink-0"
                  title="Copy payment ID"
                >
                  {copiedPaymentId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className={`${subCardClass} space-y-1`}>
              <span className="text-slate-400 block font-medium">Contribution Tier</span>
              <p className={`font-semibold ${headingText}`}>{donation.tierLabel}</p>
            </div>

            <div className={`${subCardClass} space-y-1`}>
              <span className="text-slate-400 block font-medium">Supporter</span>
              <p className={`font-semibold ${headingText}`}>
                {donation.donorName} ({donation.donorEmail})
              </p>
            </div>

            <div className={`${subCardClass} space-y-1`}>
              <span className="text-slate-400 block font-medium">Billing Location</span>
              <p className={`font-semibold truncate ${headingText}`}>{formattedAddress}</p>
            </div>
          </div>

          {donation.message && (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 italic">
              Supporter Note: "{donation.message}"
            </div>
          )}
        </div>
      )}

      {/* 3. Viral Direct Social Sharing */}
      <div className={cardClass + ' space-y-4'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 shrink-0 text-indigo-500" />
              <h2 className={`text-base font-bold ${headingText}`}>
                Inspire Others & Share Your Support
              </h2>
            </div>
            <p className={`text-xs ${mutedText}`}>
              Let friends, classmates, and colleagues know about zero-upload private document processing.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider self-start sm:self-auto">
            #SupportFreeSoftware
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          <a
            href={linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
              isDark
                ? 'bg-[#0077b5]/15 border-[#0077b5]/30 text-[#0077b5] hover:bg-[#0077b5]/25'
                : 'bg-[#0077b5]/10 border-[#0077b5]/20 text-[#0077b5] hover:bg-[#0077b5]/20'
            }`}
          >
            <Linkedin className="w-4 h-4 shrink-0" />
            <span>LinkedIn</span>
          </a>

          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <Twitter className="w-4 h-4 shrink-0" />
            <span>X (Twitter)</span>
          </a>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
              isDark
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
          </a>

          <a
            href={facebookShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
              isDark
                ? 'bg-blue-600/15 border-blue-600/30 text-blue-400 hover:bg-blue-600/25'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Facebook className="w-4 h-4 shrink-0" />
            <span>Facebook</span>
          </a>

          <button
            onClick={handleCopyLink}
            className={`col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500 text-white border-emerald-500'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {copiedLink ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* 4. Return to Studio Action */}
      <div className={`${subCardClass} p-5 flex flex-col sm:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${headingText}`}>Ready to continue working?</h3>
            <p className={`text-xs ${mutedText}`}>
              Explore our 18 private, zero-upload document and business tools.
            </p>
          </div>
        </div>

        <button
          onClick={() => (onNavigateTool ? onNavigateTool('pdf-multitool') : onNavigatePage('how-to-use'))}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[42px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer touch-manipulation"
        >
          <span>Open PDF & File Studio</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  );
};
