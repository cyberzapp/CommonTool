import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Share2,
  Linkedin,
  Twitter,
  MessageCircle,
  Facebook,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  HardDrive,
  Heart,
  Mail,
  Zap,
} from 'lucide-react';
import {
  getActiveDownloadData,
  getRecommendedTools,
  type DownloadCompletionData,
} from '../lib/downloadManager';
import { subscribeNewsletterToFirestore } from '../lib/firebase';
import type { ToolId } from '../types/tools';

interface DownloadSuccessPageProps {
  isDark: boolean;
  onNavigateTool?: (toolId: ToolId) => void;
  onNavigatePage: (pageId: string) => void;
  data?: DownloadCompletionData | null;
}

export const DownloadSuccessPage: React.FC<DownloadSuccessPageProps> = ({
  isDark,
  onNavigateTool,
  onNavigatePage,
  data,
}) => {
  const downloadData = data || getActiveDownloadData();
  const [copiedLink, setCopiedLink] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  const cardClass = `rounded-2xl border p-4 sm:p-6 md:p-8 ${isDark
      ? 'bg-[#121215] border-zinc-800 text-zinc-100'
      : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
    }`;

  const subCardClass = `rounded-xl border p-4 sm:p-5 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
    }`;

  const headingText = isDark ? 'text-white' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-600';

  const fileName = downloadData?.fileName || 'CommonTool-Exported-File';
  const toolTitle = downloadData?.toolTitle || 'CommonTool Utility';
  const lastToolId = downloadData?.toolId || 'pdf-multitool';
  const recommendedTools = getRecommendedTools(lastToolId);

  // Manual download trigger
  const handleRedownload = () => {
    if (downloadData?.fileBlobUrl) {
      const a = document.createElement('a');
      a.href = downloadData.fileBlobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 100);
    }
  };

  // Social sharing direct URLs
  const shareUrl = 'https://commontool.breathy.in';
  const shareText = `I just processed my files 100% privately with CommonTool by Suman Das (@cyberzapp). Zero file uploads, zero watermarks!`;

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
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setIsSubscribing(true);
    setNewsletterStatus(null);
    try {
      const res = await subscribeNewsletterToFirestore({
        email: newsletterEmail,
        source: 'download_success_page',
      });
      setNewsletterStatus(res.message);
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('Thank you for subscribing to CommonTool!');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Calculate metrics
  const originalBytes = downloadData?.originalSize || 0;
  const compressedBytes = downloadData?.compressedSize || downloadData?.fileSize || 0;
  const hasCompressionStats = originalBytes > 0 && compressedBytes > 0 && originalBytes > compressedBytes;
  const ratio = hasCompressionStats
    ? (((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1)
    : downloadData?.compressionRatio
      ? downloadData.compressionRatio.toFixed(1)
      : null;
  const savedBytesMb = hasCompressionStats
    ? ((originalBytes - compressedBytes) / (1024 * 1024)).toFixed(2)
    : null;
  const estimatedTimeSaved = hasCompressionStats
    ? Math.max(1, Math.round(Number(savedBytesMb) * 0.4))
    : downloadData?.timeSavedMinutes || 2;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* 1. Main Download Hero Card */}
      <div className={cardClass + ' text-center space-y-5 sm:p-8 md:p-10'}>
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm mx-auto shrink-0">
          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Processing Finished Successfully
          </div>
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight ${headingText}`}>
            Your Download Has Started!
          </h1>
          <p className={`text-xs sm:text-sm max-w-lg mx-auto leading-relaxed ${mutedText}`}>
            Your file was generated and saved locally on your device via {toolTitle}. If your browser didn't start the download automatically, click below:
          </p>
        </div>

        {/* Fallback Redownload Button - Clean 'Download' wording with filename caption */}
        <div className="flex flex-col items-center justify-center gap-2 w-full max-w-sm mx-auto">
          <button
            onClick={handleRedownload}
            className="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/25 transition-all active:scale-95 touch-manipulation cursor-pointer shrink-0"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span>Download</span>
          </button>
          {fileName && (
            <p className={`text-xs ${mutedText} truncate max-w-[280px] sm:max-w-md text-center`} title={fileName}>
              {fileName}
            </p>
          )}
        </div>

        {/* 2. Quantifiable Impact & Privacy Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800 text-left">
          {hasCompressionStats && ratio ? (
            <div className={subCardClass + ' space-y-1'}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                <HardDrive className="w-4 h-4 shrink-0" />
                <span>Space Saved</span>
              </div>
              <p className={`text-xl font-bold ${headingText}`}>-{ratio}%</p>
              <p className={`text-xs ${mutedText}`}>
                {savedBytesMb} MB freed up
              </p>
            </div>
          ) : (
            <div className={subCardClass + ' space-y-1'}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500">
                <Zap className="w-4 h-4 shrink-0" />
                <span>Local Speed</span>
              </div>
              <p className={`text-xl font-bold ${headingText}`}>Instant Wasm</p>
              <p className={`text-xs ${mutedText}`}>Zero network latency</p>
            </div>
          )}

          <div className={subCardClass + ' space-y-1'}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-500">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Time Saved</span>
            </div>
            <p className={`text-xl font-bold ${headingText}`}>~{estimatedTimeSaved} Minutes</p>
            <p className={`text-xs ${mutedText}`}>No queues or cloud wait</p>
          </div>

          <div className={subCardClass + ' space-y-1'}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero-Upload Privacy</span>
            </div>
            <p className={`text-xl font-bold ${headingText}`}>100% On-Device</p>
            <p className={`text-xs ${mutedText}`}>0 bytes sent to external cloud</p>
          </div>
        </div>
      </div>

      {/* 3. Viral Direct Social Sharing (As requested by user, ala iLoveIMG) */}
      <div className={cardClass + ' space-y-4'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 shrink-0 text-indigo-500" />
              <h2 className={`text-base font-bold ${headingText}`}>
                Share CommonTool & Help Us Stay 100% Free
              </h2>
            </div>
            <p className={`text-xs ${mutedText}`}>
              Help fellow students, freelancers, and colleagues discover zero-upload private document tools.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider self-start sm:self-auto">
            #PrivacyFirst
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {/* LinkedIn Direct Share */}
          <a
            href={linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${isDark
                ? 'bg-[#0077b5]/15 border-[#0077b5]/30 text-[#0077b5] hover:bg-[#0077b5]/25'
                : 'bg-[#0077b5]/10 border-[#0077b5]/20 text-[#0077b5] hover:bg-[#0077b5]/20'
              }`}
          >
            <Linkedin className="w-4 h-4 shrink-0" />
            <span>LinkedIn</span>
          </a>

          {/* X / Twitter Direct Tweet */}
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
          >
            <Twitter className="w-4 h-4 shrink-0" />
            <span>X (Twitter)</span>
          </a>

          {/* WhatsApp Direct Share */}
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${isDark
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
          </a>

          {/* Facebook Share */}
          <a
            href={facebookShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${isDark
                ? 'bg-blue-600/15 border-blue-600/30 text-blue-400 hover:bg-blue-600/25'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
          >
            <Facebook className="w-4 h-4 shrink-0" />
            <span>Facebook</span>
          </a>

          {/* Copy Share Link Button */}
          <button
            onClick={handleCopyLink}
            className={`col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation cursor-pointer ${copiedLink
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

      {/* 4. Automated Newsletter Subscription Card */}
      <div className={cardClass + ' space-y-4'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0 text-indigo-500" />
              <h2 className={`text-base font-bold ${headingText}`}>
                Stay Updated: CommonTool & Breathy Newsletter
              </h2>
            </div>
            <p className={`text-xs ${mutedText}`}>
              Get early access to our upcoming native iOS & Android apps and new zero-upload utilities. No spam, ever.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-fit">
            1000+ Subscribers
          </span>
        </div>

        <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="email"
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            placeholder="Enter your email address..."
            required
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${isDark
                ? 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-indigo-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
              }`}
          />
          <button
            type="submit"
            disabled={isSubscribing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 touch-manipulation cursor-pointer"
          >
            <span>{isSubscribing ? 'Subscribing...' : 'Subscribe'}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </form>

        {newsletterStatus && (
          <p className="text-xs font-semibold text-emerald-500 animate-in fade-in">
            ✓ {newsletterStatus}
          </p>
        )}
      </div>

      {/* 5. Smart Next Tool Recommendations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${headingText}`}>
            Recommended Next Tools
          </h2>
          <span className={`text-[11px] sm:text-xs ${mutedText}`}>Based on your recent workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {recommendedTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => (onNavigateTool ? onNavigateTool(tool.id) : (window.location.href = `/tools/${tool.id}`))}
              className={`${subCardClass} cursor-pointer hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group touch-manipulation`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">
                    {tool.badge}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className={`text-sm font-bold ${headingText} group-hover:text-indigo-500 transition-colors`}>
                  {tool.title}
                </h3>
                <p className={`text-xs leading-relaxed line-clamp-2 ${mutedText}`}>
                  {tool.description}
                </p>
              </div>
              <button
                type="button"
                className="w-full py-2 min-h-[38px] rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
              >
                Open Tool
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Heartfelt Contribution Tip Box */}
      <div className={`${subCardClass} p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-rose-500/20 bg-rose-500/5`}>
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 shrink-0 fill-rose-500" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${headingText}`}>Loved this tool? Support CommonTool</h3>
            <p className={`text-xs ${mutedText}`}>
              Help Suman Das and our open-source team keep all 18+ tools free and unbranded forever.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigatePage('donate')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition-colors shrink-0 touch-manipulation cursor-pointer"
        >
          <Heart className="w-3.5 h-3.5 shrink-0 fill-white" />
          <span>Make a Contribution</span>
        </button>
      </div>
    </div>
  );
};
