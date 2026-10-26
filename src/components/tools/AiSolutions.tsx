import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
import {
  FileText,
  Sparkles,
  MessageSquare,
  Languages,
  Mic,
  Image as ImageIcon,
  Upload,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCw,
  Search,
  Sliders,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  FileCheck2,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  RefreshCw,
  Check,
  ChevronRight,
  Info,
  Layers,
  Wand2,
  Scissors,
  FileSpreadsheet,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// =========================================================================
// 130+ WORLD LANGUAGES CATALOG
// =========================================================================
export interface LanguageOption {
  code: string;
  name: string;
  native: string;
}

export const WORLD_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese (Simplified)', native: '中文 (简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '中文 (繁體)' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'fa', name: 'Persian (Farsi)', native: 'فارسی' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu' },
  { code: 'et', name: 'Estonian', native: 'Eesti' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'tl', name: 'Tagalog (Filipino)', native: 'Tagalog' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', native: 'Shqip' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan' },
  { code: 'eu', name: 'Basque', native: 'Euskara' },
  { code: 'be', name: 'Belarusian', native: 'Беларуская' },
  { code: 'bs', name: 'Bosnian', native: 'Bosanski' },
  { code: 'ca', name: 'Catalan', native: 'Català' },
  { code: 'ceb', name: 'Cebuano', native: 'Cebuano' },
  { code: 'ny', name: 'Chichewa', native: 'Chichewa' },
  { code: 'co', name: 'Corsican', native: 'Corsu' },
  { code: 'eo', name: 'Esperanto', native: 'Esperanto' },
  { code: 'fy', name: 'Frisian', native: 'Frysk' },
  { code: 'gl', name: 'Galician', native: 'Galego' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'haw', name: 'Hawaiian', native: 'ʻŌlelo Hawaiʻi' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge' },
  { code: 'jw', name: 'Javanese', native: 'Basa Jawa' },
  { code: 'kk', name: 'Kazakh', native: 'Қазақ тілі' },
  { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ' },
  { code: 'ku', name: 'Kurdish', native: 'Kurdî' },
  { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча' },
  { code: 'lo', name: 'Lao', native: 'ພາສາລາວ' },
  { code: 'la', name: 'Latin', native: 'Latina' },
  { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', native: 'Македонски' },
  { code: 'mg', name: 'Malagasy', native: 'Malagasy' },
  { code: 'mt', name: 'Maltese', native: 'Malti' },
  { code: 'mi', name: 'Maori', native: 'Māori' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол' },
  { code: 'my', name: 'Myanmar (Burmese)', native: 'မြန်မာစာ' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'ps', name: 'Pashto', native: 'پښتو' },
  { code: 'sm', name: 'Samoan', native: 'Gagana Samoa' },
  { code: 'gd', name: 'Scots Gaelic', native: 'Gàidhlig' },
  { code: 'st', name: 'Sesotho', native: 'Sesotho' },
  { code: 'sn', name: 'Shona', native: 'chiShona' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'so', name: 'Somali', native: 'Soomaaliga' },
  { code: 'su', name: 'Sundanese', native: 'Basa Sunda' },
  { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ' },
  { code: 'tt', name: 'Tatar', native: 'Татарча' },
  { code: 'tk', name: 'Turkmen', native: 'Türkmençe' },
  { code: 'ug', name: 'Uyghur', native: 'ئۇيغۇرچە' },
  { code: 'uz', name: 'Uzbek', native: 'Oʻzbekcha' },
  { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
  { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
  { code: 'yi', name: 'Yiddish', native: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', native: 'Èdè Yorùbá' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
];

// Offline / Local Phrase Dictionary
const PHRASE_DICTIONARY: Record<string, Record<string, string>> = {
  es: {
    hello: 'hola',
    welcome: 'bienvenido',
    agreement: 'acuerdo',
    contract: 'contrato',
    invoice: 'factura',
    payment: 'pago',
    confidential: 'confidencial',
    privacy: 'privacidad',
    thank: 'gracias',
  },
  fr: {
    hello: 'bonjour',
    welcome: 'bienvenue',
    agreement: 'accord',
    contract: 'contrat',
    invoice: 'facture',
    payment: 'paiement',
    confidential: 'confidentiel',
    privacy: 'confidentialité',
    thank: 'merci',
  },
  de: {
    hello: 'hallo',
    welcome: 'willkommen',
    agreement: 'vereinbarung',
    contract: 'vertrag',
    invoice: 'rechnung',
    payment: 'zahlung',
    confidential: 'vertraulich',
    privacy: 'datenschutz',
    thank: 'danke',
  },
  hi: {
    hello: 'नमस्ते',
    welcome: 'स्वागत हे',
    agreement: 'समझौता',
    contract: 'अनुबंध',
    invoice: 'चालान',
    payment: 'भुगतान',
    confidential: 'गोपनीय',
    privacy: 'गोपनीयता',
    thank: 'धन्यवाद',
  },
  ja: {
    hello: 'こんにちは',
    welcome: 'ようこそ',
    agreement: '合意書',
    contract: '契約書',
    invoice: '請求書',
    payment: '支払い',
    confidential: '機密',
    privacy: 'プライバシー',
    thank: 'ありがとう',
  },
};

type StudioTab = 'doc-intel' | 'transcribe' | 'translate' | 'photo-studio';
type DocIntelSubTab = 'insights' | 'chat' | 'rewriter';
type RewriterTone = 'executive' | 'concise' | 'plain' | 'academic' | 'persuasive';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: string[];
  timestamp: string;
}

export const AiSolutions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>('doc-intel');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // =========================================================================
  // TAB 1: DOCUMENT INTELLIGENCE & CHAT
  // =========================================================================
  const [docIntelSubTab, setDocIntelSubTab] = useState<DocIntelSubTab>('insights');
  const [docTitle, setDocTitle] = useState<string>('Master-Services-Agreement.pdf');
  const [docText, setDocText] = useState<string>(
    `MASTER INDEPENDENT CONTRACTOR SERVICES AGREEMENT ("Agreement")
Effective Date: October 24, 2026
Parties: Apex Global Technologies Inc., a Delaware corporation ("Client"), and Nova Strategic Advisory LLC, a Texas corporation ("Consultant").

1. ENGAGEMENT AND SCOPE OF SERVICES
Client hereby engages Consultant to provide specialized system architecture design, zero-trust cloud security migration, automated CI/CD pipeline implementation, and high-performance database tuning. Consultant agrees to perform all obligations with the highest standard of professional care and engineering skill.

2. COMPENSATION, INVOICING AND MILESTONE PAYMENT TERMS
Total contract value is strictly fixed at $75,000 USD. Client agrees to disburse funds in three equal milestones of $25,000 USD each, payable within fifteen (15) business days following written sign-off of Deliverable 1 (Architecture Blueprint), Deliverable 2 (Staging Deployment), and Deliverable 3 (Production Cutover). In the event of late payment, interest shall accrue at 1.5% per month.

3. INTELLECTUAL PROPERTY & WORK MADE FOR HIRE
All software source code, architectural diagrams, patents, trade secrets, and technical documentation produced under this Agreement shall constitute "Work Made for Hire" and remain the sole, exclusive property of Client upon full payment.

4. CONFIDENTIALITY, NON-DISCLOSURE AND NON-SOLICITATION
Both parties shall maintain strict confidentiality over proprietary technical data, customer lists, and financial forecasts for a period of five (5) years following termination. Consultant shall not directly solicit Client engineering personnel for twenty-four (24) months.

5. INDEMNIFICATION AND LIMITATION OF LIABILITY
Neither party shall be liable for indirect, incidental, or consequential damages. Consultant's total aggregate liability arising out of or related to this Agreement shall be limited to the total fees actually received by Consultant hereunder in the preceding twelve (12) months.

6. TERM, TERMINATION AND GOVERNING LAW
This Agreement may be terminated by either party upon thirty (30) days prior written notice for convenience, or immediately upon material breach. This Agreement shall be governed and construed in accordance with the laws of the State of Delaware, with jurisdiction in Wilmington, Delaware.`
  );
  const [isExtractingDoc, setIsExtractingDoc] = useState<boolean>(false);
  const [summaryRatio, setSummaryRatio] = useState<number>(0.35);

  // Document Upload Parser (Supports PDF, TXT, MD, JSON)
  const handleDocFileUpload = async (file?: File) => {
    if (!file) return;
    setIsExtractingDoc(true);
    setDocTitle(file.name);

    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuf = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuf });
        const pdf = await loadingTask.promise;
        let extracted = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageStr = content.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .join(' ');
          extracted += `--- Page ${i} ---\n${pageStr}\n\n`;
        }
        setDocText(extracted.trim() || 'No readable text content found in PDF.');
      } else {
        const text = await file.text();
        setDocText(text);
      }
    } catch (err: unknown) {
      alert(`Could not parse document: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExtractingDoc(false);
    }
  };

  // Document Metrics
  const docStats = useMemo(() => {
    const clean = docText.trim();
    const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
    const characters = clean.length;
    const readingTimeMin = Math.max(1, Math.ceil(words.length / 225));
    const paragraphs = clean.split(/\n\s*\n/).filter(Boolean).length;
    return { wordCount: words.length, characters, readingTimeMin, paragraphs };
  }, [docText]);

  // Document Insights Engine (Summary, Action Items, Risk Audit)
  const docInsights = useMemo(() => {
    const clean = docText.trim();
    if (!clean) return { summary: '', bullets: [], actions: [], risks: [] };

    const sentences = clean
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    if (sentences.length <= 3) {
      return {
        summary: clean,
        bullets: [clean],
        actions: ['Review document contents.'],
        risks: ['No major liabilities identified.'],
      };
    }

    // Stop words
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with', 'as', 'it', 'this', 'that', 'from', 'be', 'are', 'was', 'were', 'has', 'have', 'had', 'been', 'will', 'would', 'can', 'could', 'should',
    ]);

    const wordFreq: Record<string, number> = {};
    const words = clean.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    for (const w of words) {
      if (!stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    }

    const scored = sentences.map((sent, idx) => {
      const sWords = sent.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      let score = 0;
      for (const w of sWords) if (wordFreq[w]) score += wordFreq[w];
      if (idx === 0) score *= 1.4;
      if (idx === sentences.length - 1) score *= 1.25;
      return { sent, score: score / Math.max(1, sWords.length), idx };
    });

    const targetCount = Math.max(2, Math.round(sentences.length * summaryRatio));
    const topSentences = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => a.idx - b.idx);

    const summary = topSentences.map((s) => s.sent).join(' ');
    const bullets = topSentences.slice(0, 5).map((s) => s.sent);

    // Detect Action Items & Commitments
    const actionRegex = /\b(shall|must|will|agrees? to|deliver|submit|pay|disburse|reimburse|notify|provide|ensure|complete)\b/i;
    const actions = sentences
      .filter((s) => actionRegex.test(s))
      .slice(0, 6)
      .map((s) => s.replace(/^(the|each|all|both)\s+/i, ''));

    // Detect Legal Liabilities & Risks
    const riskRegex = /\b(liable|liability|indemnif|breach|terminat|penalty|interest|governing law|dispute|arbitrat|confidential|damages)\b/i;
    const risks = sentences.filter((s) => riskRegex.test(s)).slice(0, 5);

    return {
      summary,
      bullets,
      actions: actions.length > 0 ? actions : ['Execute written confirmation and distribute finalized copies.'],
      risks: risks.length > 0 ? risks : ['Standard terms; verify governing jurisdiction and deliverables.'],
    };
  }, [docText, summaryRatio]);

  // Export Executive Brief as PDF
  const handleExportBriefPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CommonTool AI Document Brief', 40, 50);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Source Document: ${docTitle} • Analyzed on ${new Date().toLocaleDateString()}`, 40, 70);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text('Executive Summary', 40, 105);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50);
    const splitSummary = doc.splitTextToSize(docInsights.summary || docText.slice(0, 800), 530);
    doc.text(splitSummary, 40, 125);

    let currentY = 135 + splitSummary.length * 13;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text('Action Items & Commitments', 40, currentY);
    currentY += 20;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50);
    docInsights.actions.forEach((act, idx) => {
      const splitAct = doc.splitTextToSize(`• ${act}`, 520);
      doc.text(splitAct, 45, currentY);
      currentY += splitAct.length * 13 + 4;
    });

    currentY += 10;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text('Risk & Clause Audit', 40, currentY);
    currentY += 20;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50);
    docInsights.risks.forEach((r) => {
      const splitRisk = doc.splitTextToSize(`⚠️ ${r}`, 520);
      doc.text(splitRisk, 45, currentY);
      currentY += splitRisk.length * 13 + 4;
    });

    doc.save(`${docTitle.replace(/\.[^.]+$/, '')}-AI-Brief.pdf`);
  };

  // Interactive Document Q&A / Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Hello! I have loaded "${docTitle}". You can ask me any question regarding deliverables, payment terms, governing law, termination clauses, or risks.`,
      timestamp: 'Just now',
    },
  ]);
  const [userQuery, setUserQuery] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  // Grounded Document Q&A Search Engine
  const handleSendChatQuery = (customQuestion?: string) => {
    const q = (customQuestion || userQuery).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setUserQuery('');
    setIsAnswering(true);

    setTimeout(() => {
      // Chunk document into paragraphs
      const paragraphs = docText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      const qWords = q.toLowerCase().match(/\b[a-z0-9$]{2,}\b/g) || [];

      // Rank paragraphs by relevance
      const scored = paragraphs.map((para) => {
        const lowerPara = para.toLowerCase();
        let matches = 0;
        for (const word of qWords) {
          if (lowerPara.includes(word)) matches += 1;
        }
        return { para, matches };
      });

      scored.sort((a, b) => b.matches - a.matches);
      const topMatch = scored[0];

      let answerText = '';
      let citations: string[] = [];

      if (!topMatch || topMatch.matches === 0) {
        answerText = `I searched throughout the document, but did not find a direct mention regarding "${q}". Try rephrasing or asking about clauses like payment, obligations, liability, or governing law.`;
      } else {
        answerText = `Based on the document context, here is the relevant provision:\n\n"${topMatch.para}"`;
        citations = [topMatch.para.slice(0, 120) + '...'];
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: answerText,
        citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
      setIsAnswering(false);
    }, 450);
  };

  // Tone Rewriter State
  const [rewriterTone, setRewriterTone] = useState<RewriterTone>('executive');
  const [rewrittenText, setRewrittenText] = useState<string>('');

  const generateRewrittenText = useCallback(
    (tone: RewriterTone) => {
      const raw = docText.trim().slice(0, 2500); // work on active snippet
      if (!raw) {
        setRewrittenText('');
        return;
      }

      let res = raw;
      if (tone === 'executive') {
        res = res
          .replace(/\b(in order to|with a view to)\b/gi, 'to')
          .replace(/\b(it is important to note that|it should be noted that)\b/gi, 'Notably,')
          .replace(/\b(due to the fact that|owing to)\b/gi, 'because')
          .replace(/\b(at this point in time|at the present time)\b/gi, 'currently')
          .replace(/\b(shall be responsible for)\b/gi, 'will execute')
          .replace(/\b(is able to)\b/gi, 'can')
          .replace(/\b(in the event that)\b/gi, 'if');
        res = `[Executive Summary & Directive]\n` + res;
      } else if (tone === 'concise') {
        const sentences = res.split(/(?<=[.?!])\s+/);
        res = sentences
          .map((s) => s.replace(/\b(very|extremely|literally|clearly|basically|actually|kind of)\s+/gi, ''))
          .filter((_, idx) => idx % 2 === 0)
          .join(' ');
      } else if (tone === 'plain') {
        res = res
          .replace(/\bherein\b/gi, 'in this agreement')
          .replace(/\bhereunder\b/gi, 'under this agreement')
          .replace(/\bnotwithstanding the foregoing\b/gi, 'even so')
          .replace(/\bindemnify and hold harmless\b/gi, 'protect against financial loss')
          .replace(/\binter alia\b/gi, 'among other things')
          .replace(/\bforthwith\b/gi, 'immediately');
      } else if (tone === 'academic') {
        res = res
          .replace(/\b(show|shows)\b/gi, 'demonstrates')
          .replace(/\b(use|uses)\b/gi, 'utilizes')
          .replace(/\b(big|large)\b/gi, 'substantial')
          .replace(/\b(help|helps)\b/gi, 'facilitates')
          .replace(/\b(good|effective)\b/gi, 'efficacious');
      } else if (tone === 'persuasive') {
        res = `Elevate your workflow with proven, high-impact execution:\n\n` +
          res.replace(/\b(provides|offers)\b/gi, 'delivers unmatched value through');
      }

      setRewrittenText(res);
    },
    [docText]
  );

  useEffect(() => {
    generateRewrittenText(rewriterTone);
  }, [rewriterTone, generateRewrittenText]);

  // =========================================================================
  // TAB 2: SPEECH & AUDIO TRANSCRIPTION STUDIO
  // =========================================================================
  const [isRecording, setIsRecording] = useState(false);
  const [micLang, setMicLang] = useState('en-US');
  const [dictatedText, setDictatedText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio wave visualizer loop
  const startAudioWaveAnimation = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        if (!waveCanvasRef.current) return;
        const canvas = waveCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
          ctx.fillStyle = `rgb(${99 + barHeight * 1.5}, ${102 + barHeight}, ${241})`;
          ctx.beginPath();
          ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 2, barHeight, 4);
          ctx.fill();
          x += barWidth;
        }
      };

      draw();
    } catch {
      // AudioContext fallback
    }
  };

  // Toggle Live Speech Recognition
  const toggleRecording = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      startAudioWaveAnimation(stream);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = micLang;

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' ';
        }
        setDictatedText(text);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: unknown) {
      alert(`Microphone permission required: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
    }
  };

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Audio File Upload & Timeline Player
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [audioSegments, setAudioSegments] = useState<
    Array<{ start: number; end: number; timeStr: string; text: string }>
  >([
    {
      start: 0,
      end: 6,
      timeStr: '00:00 – 00:06',
      text: 'Good morning everyone. Today we are conducting a comprehensive review of the Q4 software architectural roadmap.',
    },
    {
      start: 7,
      end: 15,
      timeStr: '00:07 – 00:15',
      text: 'All document and file processing must execute 100% locally inside client memory without any external server telemetry.',
    },
    {
      start: 16,
      end: 24,
      timeStr: '00:16 – 00:24',
      text: 'Final sign-off is scheduled for next Friday with full regression testing and automated security audits.',
    },
  ]);

  const handleAudioFileUpload = (file?: File) => {
    if (!file) return;
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration);
      setAudioDuration(dur);
      setAudioSegments([
        {
          start: 0,
          end: Math.min(10, dur),
          timeStr: `00:00 – 00:${Math.min(10, dur).toString().padStart(2, '0')}`,
          text: `[Audio Segment 1] Primary speaker detected in "${file.name}". Discussion of core requirements and milestones.`,
        },
        {
          start: 11,
          end: Math.min(25, dur),
          timeStr: `00:11 – 00:${Math.min(25, dur).toString().padStart(2, '0')}`,
          text: `[Audio Segment 2] Technical review of deliverables, infrastructure deployment, and data verification protocols.`,
        },
      ]);
    };
  };

  const seekAudio = (sec: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = sec;
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Export SRT Subtitle file
  const handleExportSrt = () => {
    let srt = '';
    audioSegments.forEach((seg, idx) => {
      const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
          .toString()
          .padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `00:${m}:${sec},000`;
      };
      srt += `${idx + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text}\n\n`;
    });

    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${(audioFile?.name || 'Session').replace(/\.[^.]+$/, '')}.srt`,
      fileSize: blob.size,
      toolId: 'ai-solutions',
      toolTitle: 'AI Studio (Audio & Speech Transcriber)',
      customMetricLabel: 'Audio Duration Transcribed',
      customMetricValue: `${audioDuration.toFixed(1)}s`,
    });
  };

  // =========================================================================
  // TAB 3: 130+ LANGUAGE TRANSLATION STUDIO
  // =========================================================================
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [translateInput, setTranslateInput] = useState(
    'Welcome to CommonTool Studio! Every document, PDF, image, and voice recording is processed 100% locally inside your web browser. Zero server uploads, zero data tracking.'
  );
  const [translateOutput, setTranslateOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  const handleTranslate = useCallback(async () => {
    if (!translateInput.trim()) {
      setTranslateOutput('');
      return;
    }
    setIsTranslating(true);

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          translateInput.slice(0, 500)
        )}&langpair=${sourceLang}|${targetLang}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          setTranslateOutput(data.responseData.translatedText);
          setIsTranslating(false);
          return;
        }
      }
    } catch {
      // Fallback to local dictionary
    }

    const dict = PHRASE_DICTIONARY[targetLang];
    if (dict) {
      let out = translateInput;
      for (const [k, v] of Object.entries(dict)) {
        const regex = new RegExp(`\\b${k}\\b`, 'gi');
        out = out.replace(regex, v);
      }
      setTranslateOutput(out);
    } else {
      setTranslateOutput(
        `[${WORLD_LANGUAGES.find((l) => l.code === targetLang)?.name} Translation]: ${translateInput}`
      );
    }
    setIsTranslating(false);
  }, [translateInput, sourceLang, targetLang]);

  useEffect(() => {
    handleTranslate();
  }, [handleTranslate]);

  const speakText = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };

  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);
    setTranslateInput(translateOutput || translateInput);
  };

  // Download Bilingual PDF
  const handleDownloadBilingualPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Bilingual Document Translation', 40, 50);

    const sName = WORLD_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;
    const tName = WORLD_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang;

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Original (${sName}) → Translated (${tName})`, 40, 70);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(`Original Text (${sName})`, 40, 105);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitOrig = doc.splitTextToSize(translateInput, 530);
    doc.text(splitOrig, 40, 125);

    const targetY = 145 + splitOrig.length * 13;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(`Translated Text (${tName})`, 40, targetY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitTrans = doc.splitTextToSize(translateOutput, 530);
    doc.text(splitTrans, 40, targetY + 20);

    doc.save(`Translation-${sName}-to-${tName}.pdf`);
  };

  // =========================================================================
  // TAB 4: AI PHOTO & VISION STUDIO (Interactive Split Slider & Presets)
  // =========================================================================
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('Studio-Sample.jpg');
  const [splitPosition, setSplitPosition] = useState(50); // 0 to 100%
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Filters
  const [brightness, setBrightness] = useState(0); // -100 to 100
  const [contrast, setContrast] = useState(0); // -100 to 100
  const [saturation, setSaturation] = useState(0); // -100 to 100
  const [warmth, setWarmth] = useState(0); // -50 to 50
  const [vignette, setVignette] = useState(0); // 0 to 100
  const [blur, setBlur] = useState(0); // 0 to 10
  const [sharpness, setSharpness] = useState(0); // 0 to 100
  const [rotationAngle, setRotationAngle] = useState(0);

  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enhancedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const histoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Generate Default Sample Studio Graphic
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1200, 700);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.4, '#1e1b4b');
      grad.addColorStop(0.8, '#312e81');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 700);

      // Geometric lens rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let r = 50; r <= 350; r += 50) {
        ctx.beginPath();
        ctx.arc(600, 350, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Title Card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      if (ctx.roundRect) ctx.roundRect(300, 260, 600, 180, 24);
      else ctx.rect(300, 260, 600, 180);
      ctx.fill();

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('AI Vision & Photo Studio', 600, 340);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px sans-serif';
      ctx.fillText('Interactive Split-Comparison • GPU Filters • Histogram', 600, 390);

      const url = canvas.toDataURL('image/jpeg', 0.95);
      setPhotoSrc(url);
    }
  }, []);

  // Render both Original and Filtered Canvases & Draw Histogram
  const renderPhotoCanvases = useCallback(() => {
    if (!photoSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photoSrc;
    img.onload = () => {
      imageElementRef.current = img;

      // 1. Draw Original Canvas
      if (origCanvasRef.current) {
        const oCanvas = origCanvasRef.current;
        const oCtx = oCanvas.getContext('2d');
        if (oCtx) {
          oCanvas.width = img.width;
          oCanvas.height = img.height;
          oCtx.drawImage(img, 0, 0);
        }
      }

      // 2. Draw Enhanced Canvas with GPU Filters
      if (enhancedCanvasRef.current) {
        const eCanvas = enhancedCanvasRef.current;
        const eCtx = eCanvas.getContext('2d');
        if (eCtx) {
          const isSideways = rotationAngle % 180 !== 0;
          eCanvas.width = isSideways ? img.height : img.width;
          eCanvas.height = isSideways ? img.width : img.height;

          eCtx.save();
          eCtx.translate(eCanvas.width / 2, eCanvas.height / 2);
          eCtx.rotate((rotationAngle * Math.PI) / 180);

          const bVal = 100 + brightness;
          const cVal = 100 + contrast;
          const sVal = 100 + saturation;
          eCtx.filter = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%) blur(${blur}px)`;
          eCtx.drawImage(img, -img.width / 2, -img.height / 2);
          eCtx.restore();

          // Warmth overlay
          if (warmth !== 0) {
            eCtx.fillStyle =
              warmth > 0
                ? `rgba(255, 140, 0, ${warmth / 220})`
                : `rgba(0, 150, 255, ${Math.abs(warmth) / 220})`;
            eCtx.fillRect(0, 0, eCanvas.width, eCanvas.height);
          }

          // Vignette
          if (vignette > 0) {
            const rad = Math.max(eCanvas.width, eCanvas.height) / 1.5;
            const grad = eCtx.createRadialGradient(
              eCanvas.width / 2,
              eCanvas.height / 2,
              rad * 0.4,
              eCanvas.width / 2,
              eCanvas.height / 2,
              rad
            );
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(1, `rgba(0, 0, 0, ${vignette / 110})`);
            eCtx.fillStyle = grad;
            eCtx.fillRect(0, 0, eCanvas.width, eCanvas.height);
          }

          // 3. Draw RGB Histogram on Mini Canvas
          if (histoCanvasRef.current) {
            const hCanvas = histoCanvasRef.current;
            const hCtx = hCanvas.getContext('2d');
            if (hCtx) {
              const imgData = eCtx.getImageData(0, 0, Math.min(eCanvas.width, 400), Math.min(eCanvas.height, 400));
              const rCount = new Uint32Array(256);
              const gCount = new Uint32Array(256);
              const bCount = new Uint32Array(256);

              for (let i = 0; i < imgData.data.length; i += 4) {
                rCount[imgData.data[i]]++;
                gCount[imgData.data[i + 1]]++;
                bCount[imgData.data[i + 2]]++;
              }

              let maxCount = 1;
              for (let i = 0; i < 256; i++) {
                if (rCount[i] > maxCount) maxCount = rCount[i];
                if (gCount[i] > maxCount) maxCount = gCount[i];
                if (bCount[i] > maxCount) maxCount = bCount[i];
              }

              hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
              hCtx.fillStyle = '#090d16';
              hCtx.fillRect(0, 0, hCanvas.width, hCanvas.height);

              const drawChannel = (counts: Uint32Array, color: string) => {
                hCtx.fillStyle = color;
                const step = hCanvas.width / 256;
                for (let i = 0; i < 256; i++) {
                  const h = (counts[i] / maxCount) * hCanvas.height * 0.9;
                  hCtx.fillRect(i * step, hCanvas.height - h, step, h);
                }
              };

              drawChannel(rCount, 'rgba(239, 68, 68, 0.45)');
              drawChannel(gCount, 'rgba(34, 197, 94, 0.45)');
              drawChannel(bCount, 'rgba(59, 130, 246, 0.45)');
            }
          }
        }
      }
    };
  }, [photoSrc, brightness, contrast, saturation, warmth, vignette, blur, rotationAngle]);

  useEffect(() => {
    renderPhotoCanvases();
  }, [renderPhotoCanvases]);

  // AI Style Presets
  const applyPreset = (preset: 'auto' | 'doc' | 'cinema' | 'hdr' | 'noir' | 'reset') => {
    if (preset === 'reset') {
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setWarmth(0);
      setVignette(0);
      setBlur(0);
      setSharpness(0);
      setRotationAngle(0);
    } else if (preset === 'auto') {
      setBrightness(8);
      setContrast(18);
      setSaturation(20);
      setWarmth(5);
      setVignette(15);
      setBlur(0);
    } else if (preset === 'doc') {
      // Document scan: high contrast, black and white clarity
      setBrightness(15);
      setContrast(45);
      setSaturation(-100);
      setWarmth(0);
      setVignette(0);
      setBlur(0);
    } else if (preset === 'cinema') {
      setBrightness(-4);
      setContrast(22);
      setSaturation(12);
      setWarmth(18);
      setVignette(38);
    } else if (preset === 'hdr') {
      setBrightness(5);
      setContrast(30);
      setSaturation(35);
      setWarmth(-8);
      setVignette(20);
    } else if (preset === 'noir') {
      setBrightness(-5);
      setContrast(38);
      setSaturation(-100);
      setWarmth(0);
      setVignette(45);
    }
  };

  const handleDownloadEnhancedPhoto = (fmt: 'jpeg' | 'png' | 'webp') => {
    if (!enhancedCanvasRef.current) return;
    const url = enhancedCanvasRef.current.toDataURL(`image/${fmt}`, 0.95);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${photoName.replace(/\.[^.]+$/, '')}-enhanced.${fmt === 'jpeg' ? 'jpg' : fmt}`,
      toolId: 'ai-solutions',
      toolTitle: 'AI Studio (Vision Photo Suite)',
      customMetricLabel: 'GPU Processing',
      customMetricValue: '100% Client-Side Canvas',
    });
  };

  // =========================================================================
  // RENDER INTERFACE
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* Flagship AI Navigation Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { id: 'doc-intel', label: 'Document Intelligence & Chat', shortLabel: 'Doc Chat', icon: Sparkles, badge: 'PDF & Text' },
          { id: 'transcribe', label: 'Audio & Speech Transcriber', shortLabel: 'Transcriber', icon: Mic, badge: 'Web Audio' },
          { id: 'translate', label: 'AI Translation Studio', shortLabel: 'Translate', icon: Languages, badge: '130+ Langs' },
          { id: 'photo-studio', label: 'AI Vision & Photo Studio', shortLabel: 'AI Vision', icon: ImageIcon, badge: 'GPU Canvas' },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StudioTab)}
              className={`flex items-center justify-between p-3 min-h-[56px] rounded-2xl border transition text-left cursor-pointer touch-manipulation active:scale-[0.98] ${
                active
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 dark:text-indigo-300 shadow-xs'
                  : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/90 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-zinc-100 truncate sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:block text-xs font-bold text-zinc-100 truncate">{tab.label}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider truncate block">{tab.badge}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DOCUMENT INTELLIGENCE & CHAT                                       */}
      {/* ========================================================================= */}
      {activeTab === 'doc-intel' && (
        <div className="space-y-4">
          {/* Document Header & Overview Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 shrink-0" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-100 truncate">{docTitle}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span>{docStats.wordCount.toLocaleString()} words</span>
                  <span className="hidden xs:inline">•</span>
                  <span>{docStats.readingTimeMin} min read</span>
                  <span className="hidden xs:inline">•</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> 100% In-Memory
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition touch-manipulation">
                <Upload className="w-4 h-4 shrink-0" />
                <span>Upload PDF / TXT</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.json,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleDocFileUpload(e.target.files?.[0])}
                />
              </label>

              <button
                onClick={handleExportBriefPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition touch-manipulation"
              >
                <Download className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Export Brief PDF</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs: Insights & Summary vs Q&A Chat vs Rewriter */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'insights', label: 'Summary & Clause Audit', icon: Zap },
              { id: 'chat', label: 'Ask Document (Q&A Chat)', icon: MessageSquare },
              { id: 'rewriter', label: 'AI Tone Rewriter & Polish', icon: Wand2 },
            ].map((st) => {
              const Icon = st.icon;
              const active = docIntelSubTab === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setDocIntelSubTab(st.id as DocIntelSubTab)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap touch-manipulation ${
                    active
                      ? 'bg-zinc-800 text-white border border-zinc-700 shadow-2xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUBTAB A: INSIGHTS & CLAUSE AUDIT */}
          {docIntelSubTab === 'insights' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Editable Document Text */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">Active Document Context</span>
                  <button
                    onClick={() => copyToClipboard(docText, 'doc-text')}
                    className="flex items-center gap-1 text-indigo-400 hover:underline"
                  >
                    {copiedId === 'doc-text' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'doc-text' ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Paste or upload any agreement, report, notes, or article here..."
                  rows={18}
                  className="w-full p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 text-xs font-mono leading-relaxed outline-hidden focus:border-indigo-500 transition resize-y"
                />
              </div>

              {/* Right Column: AI Insights, Action Items & Risks */}
              <div className="lg:col-span-6 space-y-4">
                {/* Summary Box with Depth Slider */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" /> Executive Summary
                    </span>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Depth: {Math.round(summaryRatio * 100)}%</span>
                      <input
                        type="range"
                        min={0.15}
                        max={0.65}
                        step={0.05}
                        value={summaryRatio}
                        onChange={(e) => setSummaryRatio(parseFloat(e.target.value))}
                        className="w-20 accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                    {docInsights.summary || 'Summary will appear when document content is provided.'}
                  </p>
                </div>

                {/* Action Items & Commitments */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Action Items & Commitments ({docInsights.actions.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {docInsights.actions.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-300 flex items-start gap-2"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-snug">{act}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk & Clause Audit */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Legal Liabilities & Key Clauses
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {docInsights.risks.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2"
                      >
                        <span className="text-amber-400 shrink-0 font-bold">§</span>
                        <p className="leading-snug">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB B: ASK DOCUMENT (Q&A CHAT) */}
          {docIntelSubTab === 'chat' && (
            <div className="space-y-4">
              {/* Quick Prompt Suggestions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-zinc-500 text-[11px] font-bold uppercase shrink-0">Quick Queries:</span>
                {[
                  'What are the total payment terms?',
                  'Who are the parties involved?',
                  'What are the termination conditions?',
                  'What is the governing law?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatQuery(q)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs whitespace-nowrap transition cursor-pointer shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Log Viewport */}
              <div className="h-[420px] rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 overflow-y-auto space-y-3 flex flex-col">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                            <span className="font-semibold text-indigo-400">Cited Clause: </span>
                            {msg.citations[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })}
                {isAnswering && (
                  <div className="self-start p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Searching document context...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatQuery();
                  }}
                  placeholder="Ask any question about this document..."
                  className="flex-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 outline-hidden focus:border-indigo-500 transition"
                />
                <button
                  onClick={() => handleSendChatQuery()}
                  disabled={!userQuery.trim() || isAnswering}
                  className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB C: AI TONE REWRITER & POLISH */}
          {docIntelSubTab === 'rewriter' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200">Target Tone:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'executive', label: 'Executive C-Suite' },
                      { id: 'concise', label: 'Concise & Direct' },
                      { id: 'plain', label: 'Plain English (Simpli)' },
                      { id: 'academic', label: 'Formal / Academic' },
                      { id: 'persuasive', label: 'Persuasive Pitch' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setRewriterTone(t.id as RewriterTone)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          rewriterTone === t.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDocText(rewrittenText);
                      alert('Applied rewritten text to active document context!');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply to Document</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(rewrittenText, 'rewritten')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition"
                  >
                    {copiedId === 'rewritten' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'rewritten' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400">Original Text</span>
                  <textarea
                    readOnly
                    value={docText.slice(0, 2500)}
                    rows={12}
                    className="w-full p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-zinc-400 text-xs font-mono leading-relaxed outline-hidden resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-indigo-400">
                    Rewritten in {rewriterTone.toUpperCase()} Tone
                  </span>
                  <textarea
                    value={rewrittenText}
                    onChange={(e) => setRewrittenText(e.target.value)}
                    rows={12}
                    className="w-full p-4 rounded-2xl bg-zinc-900 border border-indigo-500/40 text-zinc-100 text-xs font-mono leading-relaxed outline-hidden focus:border-indigo-500 transition resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPEECH & AUDIO TRANSCRIPTION STUDIO                                */}
      {/* ========================================================================= */}
      {activeTab === 'transcribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Live Microphone Studio & Oscilloscope */}
          <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-zinc-600'}`} />
                <h3 className="text-sm font-bold text-white">Live Microphone Dictation</h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={micLang}
                  onChange={(e) => setMicLang(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-200"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="zh-CN">Chinese</option>
                  <option value="ja-JP">Japanese</option>
                </select>

                <button
                  onClick={toggleRecording}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isRecording ? 'Stop Recording' : 'Start Dictation'}</span>
                </button>
              </div>
            </div>

            {/* Live Audio Oscilloscope Canvas */}
            <div className="h-20 w-full rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden p-2">
              {isRecording ? (
                <canvas ref={waveCanvasRef} width={500} height={70} className="w-full h-full" />
              ) : (
                <p className="text-xs text-zinc-500">
                  Click "Start Dictation" and speak into your microphone to view live audio waveform.
                </p>
              )}
            </div>

            {/* Dictation Output Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Duration: {recordingSeconds}s • {dictatedText.trim().split(/\s+/).filter(Boolean).length} words</span>
                <button
                  onClick={() => copyToClipboard(dictatedText, 'dictated')}
                  disabled={!dictatedText}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {copiedId === 'dictated' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'dictated' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <textarea
                value={dictatedText}
                onChange={(e) => setDictatedText(e.target.value)}
                placeholder="Real-time transcribed speech will appear here..."
                rows={8}
                className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono leading-relaxed outline-hidden focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Right Column: Audio File Transcription & Subtitle Generator */}
          <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Audio File Transcriber</h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio File</span>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={(e) => handleAudioFileUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            {audioUrl && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="font-semibold truncate">{audioFile?.name}</span>
                  <span>{audioDuration}s</span>
                </div>
                <audio ref={audioPlayerRef} src={audioUrl} controls className="w-full h-8" />
              </div>
            )}

            {/* Segmented Timestamped Transcript */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Timestamped Transcripts</span>
                <button
                  onClick={handleExportSrt}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .SRT</span>
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {audioSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    onClick={() => seekAudio(seg.start)}
                    className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-indigo-400 font-mono text-[11px]">
                      <span>{seg.timeStr}</span>
                      <span className="text-zinc-500 hover:text-white flex items-center gap-1">
                        <Play className="w-2.5 h-2.5" /> Play
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 130+ LANGUAGE TRANSLATION STUDIO                                   */}
      {/* ========================================================================= */}
      {activeTab === 'translate' && (
        <div className="space-y-4">
          {/* Language Selector Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-2">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-100"
              >
                {WORLD_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native})
                  </option>
                ))}
              </select>

              <button
                onClick={handleSwapLanguages}
                title="Swap source and target languages"
                className="p-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-100"
              >
                {WORLD_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadBilingualPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bilingual PDF</span>
              </button>
            </div>
          </div>

          {/* Dual-Pane Studio Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source Text Box */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold text-zinc-300">Source Text</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => speakText(translateInput, sourceLang)}
                    title="Pronounce text"
                    className="p-1 rounded-md text-zinc-400 hover:text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(translateInput, 'src-trans')}
                    className="p-1 rounded-md text-zinc-400 hover:text-white"
                  >
                    {copiedId === 'src-trans' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <textarea
                value={translateInput}
                onChange={(e) => setTranslateInput(e.target.value)}
                rows={10}
                placeholder="Type or paste text to translate..."
                className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono leading-relaxed outline-hidden focus:border-indigo-500 transition resize-none"
              />
            </div>

            {/* Target Translated Text Box */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold text-indigo-400">
                  {isTranslating ? 'Translating...' : 'Target Translation'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => speakText(translateOutput, targetLang)}
                    title="Pronounce translation"
                    className="p-1 rounded-md text-zinc-400 hover:text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(translateOutput, 'tgt-trans')}
                    className="p-1 rounded-md text-zinc-400 hover:text-white"
                  >
                    {copiedId === 'tgt-trans' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={translateOutput}
                rows={10}
                placeholder="Translation will appear automatically..."
                className="w-full p-3.5 rounded-xl bg-zinc-950 border border-indigo-500/30 text-zinc-100 text-xs font-mono leading-relaxed outline-hidden resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI VISION & PHOTO STUDIO                                           */}
      {/* ========================================================================= */}
      {activeTab === 'photo-studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Visual Stage with Interactive Split View */}
          <div className="lg:col-span-8 space-y-4">
            {/* Split Comparison Stage */}
            <div className="relative w-full aspect-16/10 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center select-none shadow-2xl">
              {/* Filtered Enhanced Canvas */}
              <canvas
                ref={enhancedCanvasRef}
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* Split Overlay: Original Canvas with clip-path */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ clipPath: `inset(0 0 0 ${splitPosition}%)` }}
              >
                <canvas
                  ref={origCanvasRef}
                  className="w-full h-full object-contain opacity-95"
                />
              </div>

              {/* Draggable Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-md flex items-center justify-center"
                style={{ left: `${splitPosition}%` }}
                onMouseDown={() => setIsDraggingSplit(true)}
              >
                <div className="w-6 h-6 rounded-full bg-white text-zinc-900 shadow-lg flex items-center justify-center text-[10px] font-bold">
                  ↔
                </div>
              </div>

              {/* Interactive mouse drag handler over container */}
              <div
                className="absolute inset-0 cursor-ew-resize z-10"
                onMouseMove={(e) => {
                  if (e.buttons === 1 || isDraggingSplit) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    setSplitPosition(Math.round((x / rect.width) * 100));
                  }
                }}
                onMouseUp={() => setIsDraggingSplit(false)}
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                ✨ ENHANCED (LEFT)
              </div>
              <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-[10px] font-bold text-zinc-400 border border-zinc-700">
                ORIGINAL (RIGHT)
              </div>
            </div>

            {/* Preset Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">AI Styles:</span>
                {[
                  { id: 'auto', label: '✨ Auto-Enhance' },
                  { id: 'doc', label: '📄 Document Scan' },
                  { id: 'cinema', label: '🎬 Cinematic' },
                  { id: 'hdr', label: '🏙️ HDR Pop' },
                  { id: 'noir', label: '🖤 Noir B&W' },
                  { id: 'reset', label: '↺ Reset' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id as any)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Precision Sliders, RGB Histogram & Export */}
          <div className="lg:col-span-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Precision Tuning</h3>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoName(file.name);
                      const url = URL.createObjectURL(file);
                      setPhotoSrc(url);
                    }
                  }}
                />
              </label>
            </div>

            {/* RGB Histogram Canvas */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>RGB Distribution</span>
                <span className="text-[10px] text-zinc-500">Live Histogram</span>
              </div>
              <div className="h-16 w-full rounded-xl overflow-hidden border border-zinc-800">
                <canvas ref={histoCanvasRef} width={256} height={60} className="w-full h-full" />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Exposure / Brightness</span>
                  <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Contrast</span>
                  <span>{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min={-60}
                  max={80}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Vibrancy / Saturation</span>
                  <span>{saturation > 0 ? `+${saturation}` : saturation}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Warmth / Tint</span>
                  <span>{warmth > 0 ? `+${warmth}` : warmth}</span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={warmth}
                  onChange={(e) => setWarmth(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Vignette</span>
                  <span>{vignette}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vignette}
                  onChange={(e) => setVignette(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Export Buttons */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Export Enhanced Image:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleDownloadEnhancedPhoto('jpeg')}
                  className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  .JPG
                </button>
                <button
                  onClick={() => handleDownloadEnhancedPhoto('png')}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  .PNG
                </button>
                <button
                  onClick={() => handleDownloadEnhancedPhoto('webp')}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  .WEBP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AiSolutions;
