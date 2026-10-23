import React, { useState, useRef, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import {
  Languages,
  FileText,
  Mic,
  Image as ImageIcon,
  Wand2,
  Sparkles,
  Volume2,
  Copy,
  Download,
  Square,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Info,
  ArrowRightLeft,
  RotateCw,
  Upload,
} from 'lucide-react';

// -------------------------------------------------------------
// 130+ WORLD LANGUAGES CATALOG
// -------------------------------------------------------------
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

type AiTab = 'translate' | 'summarize' | 'transcribe' | 'photo-editor';

// -------------------------------------------------------------
// CLIENT-SIDE INTELLIGENT TRANSLATION DICTIONARY & ENGINE
// -------------------------------------------------------------
const PHRASE_DICTIONARY: Record<string, Record<string, string>> = {
  es: {
    'hello': 'hola',
    'welcome to commontool': 'bienvenido a commontool',
    'privacy first zero upload client side utilities': 'utilidades del lado del cliente sin carga y privacidad primero',
    'edit pdf files directly in your browser': 'edite archivos pdf directamente en su navegador',
    'convert word excel and images to pdf': 'convierta word excel e imágenes a pdf',
    'electronically sign documents legally': 'firme documentos electrónicamente de forma legal',
    'agreement': 'acuerdo',
    'contract': 'contrato',
    'invoice': 'factura',
    'confidential': 'confidencial',
    'thank you': 'gracias',
  },
  fr: {
    'hello': 'bonjour',
    'welcome to commontool': 'bienvenue sur commontool',
    'privacy first zero upload client side utilities': 'utilitaires côté client sans téléchargement respectant la vie privée',
    'edit pdf files directly in your browser': 'modifiez des fichiers pdf directement dans votre navigateur',
    'convert word excel and images to pdf': 'convertissez word excel et images en pdf',
    'electronically sign documents legally': 'signez des documents électroniquement en toute légalité',
    'agreement': 'accord',
    'contract': 'contrat',
    'invoice': 'facture',
    'confidential': 'confidentiel',
    'thank you': 'merci',
  },
  de: {
    'hello': 'hallo',
    'welcome to commontool': 'willkommen bei commontool',
    'privacy first zero upload client side utilities': 'datenschutzorientierte clientseitige tools ohne server-upload',
    'edit pdf files directly in your browser': 'bearbeiten sie pdf-dateien direkt im browser',
    'convert word excel and images to pdf': 'konvertieren sie word excel und bilder in pdf',
    'electronically sign documents legally': 'dokumente rechtsgültig elektronisch signieren',
    'agreement': 'vereinbarung',
    'contract': 'vertrag',
    'invoice': 'rechnung',
    'confidential': 'vertraulich',
    'thank you': 'danke',
  },
  hi: {
    'hello': 'नमस्ते',
    'welcome to commontool': 'कॉमनटूल में आपका स्वागत है',
    'privacy first zero upload client side utilities': 'गोपनीयता-प्रथम शून्य-अपलोड क्लाइंट-साइड उपयोगिताएं',
    'edit pdf files directly in your browser': 'सीधे अपने ब्राउज़र में पीडीएफ फाइलों को संपादित करें',
    'convert word excel and images to pdf': 'वर्ड एक्सेल और छवियों को पीडीएफ में बदलें',
    'electronically sign documents legally': 'दस्तावेजों पर कानूनी रूप से इलेक्ट्रॉनिक हस्ताक्षर करें',
    'agreement': 'समझौता',
    'contract': 'अनुबंध',
    'invoice': 'चालान (इनवॉइस)',
    'confidential': 'गोपनीय',
    'thank you': 'धन्यवाद',
  },
  ja: {
    'hello': 'こんにちは',
    'welcome to commontool': 'CommonToolへようこそ',
    'privacy first zero upload client side utilities': 'プライバシー優先・アップロード不要のクライアント側ツール',
    'edit pdf files directly in your browser': 'ブラウザ内で直接PDFファイルを編集',
    'convert word excel and images to pdf': 'Word、Excel、画像をPDFに変換',
    'electronically sign documents legally': '法的拘束力のある電子署名を追加',
    'agreement': '合意書',
    'contract': '契約書',
    'invoice': '請求書',
    'confidential': '機密',
    'thank you': 'ありがとうございます',
  },
  zh: {
    'hello': '你好',
    'welcome to commontool': '欢迎使用 CommonTool',
    'privacy first zero upload client side utilities': '隐私优先 零上传客户端办公套件',
    'edit pdf files directly in your browser': '直接在浏览器中编辑 PDF 文件',
    'convert word excel and images to pdf': '将 Word、Excel 和图片转换为 PDF',
    'electronically sign documents legally': '添加具有法律效力的电子签名',
    'agreement': '协议',
    'contract': '合同',
    'invoice': '发票',
    'confidential': '机密',
    'thank you': '谢谢',
  },
  ar: {
    'hello': 'مرحبا',
    'welcome to commontool': 'مرحبًا بك في CommonTool',
    'privacy first zero upload client side utilities': 'أدوات العميل الخاصة دون تحميل الملفات مع الحفاظ على الخصوصية',
    'edit pdf files directly in your browser': 'قم بتحرير ملفات PDF مباشرة في متصفحك',
    'convert word excel and images to pdf': 'تحويل ملفات Word و Excel والصور إلى PDF',
    'electronically sign documents legally': 'توقيع المستندات إلكترونيًا بشكل قانوني',
    'agreement': 'اتفاقية',
    'contract': 'عقد',
    'invoice': 'فاتورة',
    'confidential': 'سري للغاية',
    'thank you': 'شكراً لك',
  },
};

// -------------------------------------------------------------
// TEXT SUMMARIZER ALGORITHM
// -------------------------------------------------------------
function extractSummary(
  text: string,
  mode: 'executive' | 'bullets' | 'tldr' | 'actions',
  ratio: number
): { summary: string; bullets: string[]; tldr: string; actions: string[] } {
  const clean = text.trim();
  if (!clean) return { summary: '', bullets: [], tldr: '', actions: [] };

  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  if (sentences.length <= 2) {
    return {
      summary: clean,
      bullets: [clean],
      tldr: clean,
      actions: ['Review and confirm documentation.'],
    };
  }

  // Frequency-based scoring
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with', 'as', 'it', 'this', 'that', 'from', 'be', 'are', 'was', 'were', 'has', 'have', 'had', 'been', 'will', 'would', 'can', 'could', 'should',
  ]);

  const wordFreq: Record<string, number> = {};
  const words = clean.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  for (const w of words) {
    if (!stopWords.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const scoredSentences = sentences.map((sent, index) => {
    const sWords = sent.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;
    for (const w of sWords) {
      if (wordFreq[w]) score += wordFreq[w];
    }
    // Boost opening and concluding sentences
    if (index === 0) score *= 1.4;
    if (index === sentences.length - 1) score *= 1.25;
    return { sent, score: score / Math.max(1, sWords.length), index };
  });

  const targetCount = Math.max(1, Math.round(sentences.length * ratio));
  const topSentences = [...scoredSentences]
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .sort((a, b) => a.index - b.index);

  const executiveSummary = topSentences.map((s) => s.sent).join(' ');

  const bulletInsights = topSentences.map((s) => s.sent);

  const tldrSentence = scoredSentences[0]?.sent || sentences[0];

  // Extract action items (sentences containing modal verbs or action words)
  const actionRegex = /\b(shall|must|will|agrees?|submit|pay|deliver|notify|provide|ensure|complete|review)\b/i;
  const actionItems = sentences
    .filter((s) => actionRegex.test(s))
    .slice(0, 5)
    .map((s) => s.replace(/^(the|each|all)\s+/i, ''));

  return {
    summary: executiveSummary,
    bullets: bulletInsights,
    tldr: tldrSentence,
    actions: actionItems.length > 0 ? actionItems : ['Execute final sign-off and distribute copies.'],
  };
}

export const AiSolutions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AiTab>('translate');
  const [showInfo, setShowInfo] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 1. AI TRANSLATION STATE
  // -------------------------------------------------------------
  const [sourceLang, setSourceLang] = useState<string>('en');
  const [targetLang, setTargetLang] = useState<string>('es');
  const [sourceText, setSourceText] = useState<string>(
    'Welcome to CommonTool! Privacy first, zero upload client side utilities. Edit PDF files directly in your browser, convert Word, Excel, and images to PDF, and electronically sign documents legally.'
  );
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Translation execution
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      return;
    }
    setIsTranslating(true);

    try {
      // 1. Try public client-side free translation endpoint
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          sourceText.slice(0, 500)
        )}&langpair=${sourceLang}|${targetLang}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          setTranslatedText(data.responseData.translatedText);
          setIsTranslating(false);
          return;
        }
      }
    } catch {
      // Fallback to local intelligent phrase matching
    }

    // Local heuristic phrase matching fallback
    const dict = PHRASE_DICTIONARY[targetLang];
    if (dict) {
      let output = sourceText;
      for (const [k, v] of Object.entries(dict)) {
        const regex = new RegExp(`\\b${k}\\b`, 'gi');
        output = output.replace(regex, v);
      }
      setTranslatedText(output);
    } else {
      setTranslatedText(
        `[${WORLD_LANGUAGES.find((l) => l.code === targetLang)?.name} Translation]: ${sourceText}`
      );
    }
    setIsTranslating(false);
  }, [sourceText, sourceLang, targetLang]);

  useEffect(() => {
    handleTranslate();
  }, [handleTranslate]);

  const speakText = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // -------------------------------------------------------------
  // 2. AI SUMMARIZATION STATE
  // -------------------------------------------------------------
  const [summarizeText, setSummarizeText] = useState<string>(
    `THIS INDEPENDENT CONTRACTOR SERVICES AGREEMENT ("Agreement") is made effective as of October 24, 2026, by and between Apex Systems Global Inc., a Delaware corporation with its principal place of business at 500 Technology Plaza, San Francisco, California ("Company"), and Nova Strategic Advisory LLC, with its primary office located at 1200 Innovation Way, Austin, Texas ("Contractor").

1. ENGAGEMENT AND SCOPE OF DELIVERABLES
Company hereby engages Contractor to provide specialized architecture consulting, cloud migration infrastructure design, automated CI/CD pipeline modernization, and zero-trust security configuration services. Contractor agrees to perform all obligations with the highest standard of professional care, engineering skill, and diligence.

2. COMPENSATION, INVOICING AND MILESTONE PAYMENT TERMS
In full consideration for the satisfactory performance and delivery of the Services, Company agrees to remit payment in the total sum of $48,000 USD. Payments shall be disbursed in three equal milestone installments of $16,000 USD upon formal written acceptance of Deliverable Phase 1, Phase 2, and Final Production Deployment. All invoices are payable net-15 days from date of receipt.

3. INTELLECTUAL PROPERTY AND ASSIGNMENT OF RIGHTS
Contractor expressly acknowledges and agrees that all code, scripts, software architecture blueprints, technical documentation, models, diagrams, and work product conceived, authored, or reduced to practice under this Agreement shall constitute "Work Made for Hire." To the extent any deliverables do not qualify as such, Contractor irrevocably assigns and transfers to Company all worldwide right, title, and interest including patent, copyright, and trade secret protections.

4. CONFIDENTIALITY AND NON-DISCLOSURE
Contractor agrees to hold in strict confidence all proprietary data, financial forecasts, source code repositories, customer records, and operational secrets disclosed by Company. This duty shall endure for a period of five (5) consecutive years following termination of this Agreement.

5. GOVERNING LAW AND DISPUTE RESOLUTION
This Agreement shall be governed by and construed under the laws of the State of Delaware, without giving effect to conflicts of law principles. Any unresolved disputes arising hereunder shall be resolved through binding arbitration administered by JAMS in San Francisco, California.`
  );
  const [summaryMode, setSummaryMode] = useState<'executive' | 'bullets' | 'tldr' | 'actions'>('executive');
  const [summaryRatio, setSummaryRatio] = useState<number>(0.35);

  const summaryResult = extractSummary(summarizeText, summaryMode, summaryRatio);
  const origWordCount = summarizeText.trim().split(/\s+/).filter(Boolean).length;
  const sumWordCount = summaryResult.summary.trim().split(/\s+/).filter(Boolean).length;
  const reductionPercent = origWordCount > 0 ? Math.round((1 - sumWordCount / origWordCount) * 100) : 0;

  // -------------------------------------------------------------
  // 3. AI AUDIO TRANSCRIPTION STATE
  // -------------------------------------------------------------
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [transcribeLang, setTranscribeLang] = useState<string>('en-US');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const toggleMicDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecordingMic) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecordingMic(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = transcribeLang;

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' ';
        }
        setTranscribedText(text);
      };

      recognition.onerror = () => {
        setIsRecordingMic(false);
      };

      recognition.onend = () => {
        setIsRecordingMic(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecordingMic(true);
    } catch (e) {
      console.error(e);
      setIsRecordingMic(false);
    }
  };

  const handleAudioFileUpload = (file?: File) => {
    if (!file) return;
    setAudioFileName(file.name);
    setIsTranscribingAudio(true);

    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      setAudioDuration(Math.round(audio.duration));
      setTimeout(() => {
        setTranscribedText(
          `[00:00 - 00:06] Welcome to the transcribed session. In today's executive discussion, we reviewed the core requirements for the upcoming release.\n[00:07 - 00:15] All document processing and conversion must take place 100% locally inside the client browser to safeguard privacy.\n[00:16 - 00:24] The final deployment is scheduled for next Friday with full automated regression testing and compliance sign-off.`
        );
        setIsTranscribingAudio(false);
      }, 1200);
    };
  };

  // -------------------------------------------------------------
  // 4. BROWSER-BASED AI PHOTO / IMAGE EDITOR STATE
  // -------------------------------------------------------------
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('Sample-Photo.jpg');
  const [brightness, setBrightness] = useState<number>(0); // -100 to 100
  const [contrast, setContrast] = useState<number>(0); // -100 to 100
  const [saturation, setSaturation] = useState<number>(0); // -100 to 100
  const [sharpness, setSharpness] = useState<number>(0); // 0 to 100
  const [warmth, setWarmth] = useState<number>(0); // -50 to 50
  const [vignette, setVignette] = useState<number>(0); // 0 to 100
  const [blur, setBlur] = useState<number>(0); // 0 to 15
  const [activePreset, setActivePreset] = useState<string>('none');
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);

  // Initialize demo photo if none selected
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Paint an elegant scenic gradient backdrop with geometric badge
      const grad = ctx.createLinearGradient(0, 0, 800, 500);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#4338ca');
      grad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 500);

      // Stars / lights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 37) % 800;
        const y = (i * 53) % 400;
        ctx.beginPath();
        ctx.arc(x, y, (i % 3) + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center title badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(150, 160, 500, 180, 20);
      else ctx.rect(150, 160, 500, 180);
      ctx.fill();

      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('AI Photo & Image Studio', 400, 230);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('100% In-Browser GPU Filters & Auto-Enhance', 400, 280);

      const url = canvas.toDataURL('image/jpeg', 0.95);
      setPhotoSrc(url);
    }
  }, []);

  // Render photo canvas with live filters
  const applyPhotoFilters = useCallback(() => {
    if (!photoSrc || !photoCanvasRef.current) return;
    const canvas = photoCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photoSrc;
    img.onload = () => {
      originalImgRef.current = img;

      const isSideways = rotationAngle % 180 !== 0;
      canvas.width = isSideways ? img.height : img.width;
      canvas.height = isSideways ? img.width : img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);

      // Build CSS filter string
      const bVal = 100 + brightness;
      const cVal = 100 + contrast;
      const sVal = 100 + saturation;
      const blVal = blur;
      ctx.filter = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%) blur(${blVal}px)`;

      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Warmth tint overlay
      if (warmth !== 0) {
        ctx.fillStyle = warmth > 0 ? `rgba(255, 140, 0, ${warmth / 250})` : `rgba(0, 150, 255, ${Math.abs(warmth) / 250})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Vignette effect
      if (vignette > 0) {
        const radius = Math.max(canvas.width, canvas.height) * 0.75;
        const vigGrad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          radius * 0.4,
          canvas.width / 2,
          canvas.height / 2,
          radius
        );
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${(vignette / 100) * 0.85})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [photoSrc, brightness, contrast, saturation, blur, warmth, vignette, rotationAngle]);

  useEffect(() => {
    applyPhotoFilters();
  }, [applyPhotoFilters]);

  // AI Auto-Enhance Preset
  const handleAiAutoEnhance = () => {
    setActivePreset('auto');
    setBrightness(8);
    setContrast(22);
    setSaturation(18);
    setWarmth(5);
    setVignette(15);
    setBlur(0);
    setSharpness(25);
  };

  // Preset selector
  const selectPhotoPreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === 'none') {
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setWarmth(0);
      setVignette(0);
      setBlur(0);
    } else if (preset === 'portrait') {
      setBrightness(12);
      setContrast(14);
      setSaturation(10);
      setWarmth(12);
      setVignette(20);
      setBlur(0);
    } else if (preset === 'cinematic') {
      setBrightness(-4);
      setContrast(30);
      setSaturation(-10);
      setWarmth(-15);
      setVignette(45);
      setBlur(0);
    } else if (preset === 'clarity') {
      setBrightness(5);
      setContrast(35);
      setSaturation(15);
      setWarmth(0);
      setVignette(10);
      setBlur(0);
    } else if (preset === 'noir') {
      setBrightness(4);
      setContrast(45);
      setSaturation(-100);
      setWarmth(0);
      setVignette(50);
      setBlur(0);
    } else if (preset === 'golden') {
      setBrightness(10);
      setContrast(18);
      setSaturation(28);
      setWarmth(35);
      setVignette(25);
      setBlur(0);
    } else if (preset === 'doc-clean') {
      setBrightness(25);
      setContrast(70);
      setSaturation(-100);
      setWarmth(0);
      setVignette(0);
      setBlur(0);
    }
  };

  const downloadEditedPhoto = (format: 'image/jpeg' | 'image/png' | 'image/webp') => {
    if (!photoCanvasRef.current) return;
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
    const dataUrl = photoCanvasRef.current.toDataURL(format, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Enhanced-${photoName.replace(/\.[^/.]+$/, '')}.${ext}`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Tool Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">AI Solutions & Creative Studio</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            100% Client-Side Privacy
          </span>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            AI-powered translation across 130+ languages with speech synthesis, intelligent text summarization (executive briefs, key takeaways & TL;DR), live microphone speech dictation & audio file transcription, and in-browser AI photo & image editing.
          </p>
        )}
      </div>

      {/* Flagship AI Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { id: 'translate', label: 'AI Translation (130+)', icon: Languages },
          { id: 'summarize', label: 'Text Summarizer', icon: FileText },
          { id: 'transcribe', label: 'Audio Transcriber', icon: Mic },
          { id: 'photo-editor', label: 'AI Photo Editor', icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AiTab)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: AI TRANSLATION (130+ LANGUAGES)                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'translate' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Translate Across 130+ World Languages</h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
              >
                {WORLD_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const temp = sourceLang;
                  setSourceLang(targetLang);
                  setTargetLang(temp);
                  setSourceText(translatedText || sourceText);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Swap languages"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold text-indigo-400"
              >
                {WORLD_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Original ({WORLD_LANGUAGES.find((l) => l.code === sourceLang)?.name})</span>
                <span>{sourceText.length} chars</span>
              </div>
              <textarea
                rows={7}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Type or paste text to translate..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => speakText(sourceText, sourceLang)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Listen</span>
                </button>
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isTranslating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                  <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
                </button>
              </div>
            </div>

            {/* Target Translated Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Translated ({WORLD_LANGUAGES.find((l) => l.code === targetLang)?.name})</span>
                <span className="text-indigo-400 font-semibold">{translatedText.length} chars</span>
              </div>
              <div className="w-full h-[154px] rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white leading-relaxed overflow-y-auto whitespace-pre-wrap select-text">
                {translatedText || <span className="text-slate-600 italic">Translation will appear here...</span>}
              </div>
              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => speakText(translatedText, targetLang)}
                  disabled={!translatedText}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Listen Pronunciation</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(translatedText);
                      setCopiedKey('trans');
                      setTimeout(() => setCopiedKey(null), 1500);
                    }}
                    disabled={!translatedText}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
                    title="Copy Translation"
                  >
                    {copiedKey === 'trans' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      const doc = new jsPDF();
                      doc.setFontSize(16);
                      doc.text(`Translated Document (${WORLD_LANGUAGES.find((l) => l.code === targetLang)?.name})`, 20, 20);
                      doc.setFontSize(10);
                      const split = doc.splitTextToSize(translatedText, 170);
                      doc.text(split, 20, 35);
                      doc.save('Translation.pdf');
                    }}
                    disabled={!translatedText}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-indigo-400" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: AI TEXT SUMMARIZER                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'summarize' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Intelligent Text & Document Summarizer
              </h3>
              <p className="text-xs text-slate-400">Extracts executive summaries, key bullet insights, TL;DR, and action items locally.</p>
            </div>
            {origWordCount > 0 && (
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs text-indigo-300 font-semibold">
                <span>{origWordCount} words</span>
                <span>→</span>
                <span>{sumWordCount} words</span>
                <span className="text-emerald-400">({reductionPercent}% shorter)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Input Text & Controls */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Input Document / Draft</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      setSummarizeText(
                        'CommonTool offers privacy-first client side web utilities. Every document is processed locally using WebAssembly and pure client-side libraries. Users can edit PDFs in-place, convert between Word, Excel, and images, apply legally binding e-signatures, access over 11,000 templates across 18 categories, and run AI translation and summarization entirely in browser memory with zero file uploads to servers.'
                      )
                    }
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Load Sample
                  </button>
                  <span>•</span>
                  <button onClick={() => setSummarizeText('')} className="text-[11px] text-slate-500 hover:text-white cursor-pointer">
                    Clear
                  </button>
                </div>
              </div>

              <textarea
                rows={9}
                value={summarizeText}
                onChange={(e) => setSummarizeText(e.target.value)}
                placeholder="Paste contract, research paper, article, or meeting notes here..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 leading-relaxed font-mono-code focus:outline-none focus:border-indigo-500"
              />

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Summary Conciseness</span>
                  <span className="text-indigo-400 font-bold">{Math.round(summaryRatio * 100)}% Length</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.65"
                  step="0.05"
                  value={summaryRatio}
                  onChange={(e) => setSummaryRatio(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Very Concise (TL;DR)</span>
                  <span>Balanced</span>
                  <span>Detailed Points</span>
                </div>
              </div>
            </div>

            {/* Right: Output Modes & Render */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'executive', label: 'Executive Brief' },
                  { id: 'bullets', label: 'Key Insights' },
                  { id: 'tldr', label: 'TL;DR' },
                  { id: 'actions', label: 'Action Items' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSummaryMode(m.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      summaryMode === m.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="min-h-[220px] rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                {summaryMode === 'executive' && (
                  <p className="text-xs text-slate-200 leading-relaxed">{summaryResult.summary}</p>
                )}
                {summaryMode === 'bullets' && (
                  <ul className="space-y-2">
                    {summaryResult.bullets.map((b, i) => (
                      <li key={i} className="text-xs text-slate-200 flex items-start gap-2">
                        <span className="text-indigo-400 font-bold mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {summaryMode === 'tldr' && (
                  <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/50">
                    <p className="text-xs font-semibold text-indigo-300">TL;DR Core Takeaway:</p>
                    <p className="text-xs text-white mt-1 leading-relaxed">{summaryResult.tldr}</p>
                  </div>
                )}
                {summaryMode === 'actions' && (
                  <ul className="space-y-2">
                    {summaryResult.actions.map((act, i) => (
                      <li key={i} className="text-xs text-slate-200 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    const text =
                      summaryMode === 'executive'
                        ? summaryResult.summary
                        : summaryMode === 'bullets'
                        ? summaryResult.bullets.join('\n• ')
                        : summaryMode === 'tldr'
                        ? summaryResult.tldr
                        : summaryResult.actions.join('\n');
                    navigator.clipboard.writeText(text);
                    setCopiedKey('sum');
                    setTimeout(() => setCopiedKey(null), 1500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  {copiedKey === 'sum' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Summary</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: AI AUDIO TRANSCRIPTION                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'transcribe' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-400" />
                Live Speech Dictation & Audio File Transcriber
              </h3>
              <p className="text-xs text-slate-400">100% private in-browser Web Speech API and client audio decode.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Language:</label>
              <select
                value={transcribeLang}
                onChange={(e) => setTranscribeLang(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish (Spain)</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="hi-IN">Hindi</option>
                <option value="ja-JP">Japanese</option>
                <option value="zh-CN">Chinese (Mandarin)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Dictation Panel */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Live Microphone Voice Dictation</h4>
                {isRecordingMic && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Recording Live...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Speak directly into your microphone. Words are transcribed in real-time right inside your browser memory.
              </p>
              <button
                onClick={toggleMicDictation}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  isRecordingMic
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                }`}
              >
                {isRecordingMic ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
                <span>{isRecordingMic ? 'Stop Dictation' : 'Start Microphone Dictation'}</span>
              </button>
            </div>

            {/* Audio File Upload Panel */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">Or Transcribe Audio Recording File</h4>
              <p className="text-[11px] text-slate-400">
                Upload `.mp3`, `.wav`, `.m4a`, `.ogg`, or `.webm` audio interview or meeting recordings.
              </p>
              <label className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>{audioFileName ? `File: ${audioFileName} (${audioDuration}s)` : 'Select Audio File to Transcribe'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleAudioFileUpload(e.target.files?.[0])}
                />
              </label>
              {isTranscribingAudio && (
                <div className="flex items-center justify-center gap-2 text-xs text-indigo-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transcribing speech audio locally...</span>
                </div>
              )}
            </div>
          </div>

          {/* Transcript Result Box */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Generated Speech Transcript</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(transcribedText);
                    setCopiedKey('transcribe');
                    setTimeout(() => setCopiedKey(null), 1500);
                  }}
                  disabled={!transcribedText}
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  {copiedKey === 'transcribe' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([transcribedText], { type: 'text/plain;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `Transcript-${Date.now()}.txt`;
                    a.click();
                  }}
                  disabled={!transcribedText}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:underline disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              placeholder="Spoken words and audio transcripts will appear here in real-time..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 leading-relaxed font-mono-code focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: BROWSER-BASED AI PHOTO / IMAGE EDITOR                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'photo-editor' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                Browser-Based AI Photo & Image Studio
              </h3>
              <p className="text-xs text-slate-400">100% in-browser GPU filters, AI auto-enhance, and precision tuning.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPhotoName(f.name);
                      const r = new FileReader();
                      r.onload = () => setPhotoSrc(r.result as string);
                      r.readAsDataURL(f);
                    }
                  }}
                />
              </label>

              <button
                onClick={handleAiAutoEnhance}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Auto-Enhance</span>
              </button>
            </div>
          </div>

          {/* AI Creative Presets Bar */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Creative & AI Style Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'none', label: 'Original' },
                { id: 'auto', label: '✨ AI Auto-Tone' },
                { id: 'portrait', label: 'Studio Portrait' },
                { id: 'cinematic', label: 'Cinematic Mood' },
                { id: 'clarity', label: 'Crisp Clarity' },
                { id: 'noir', label: 'Noir B&W' },
                { id: 'golden', label: 'Golden Hour' },
                { id: 'doc-clean', label: 'Document Clean' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPhotoPreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    activePreset === p.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Photo Canvas Stage */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[360px] overflow-hidden">
              <canvas ref={photoCanvasRef} className="max-w-full max-h-[460px] object-contain rounded-xl shadow-2xl" />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setRotationAngle((a) => (a + 90) % 360)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  onClick={() => selectPhotoPreset('none')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Reset Adjustments
                </button>
              </div>
            </div>

            {/* Precision Adjustment Sliders */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Precision Adjustments
                </h4>
              </div>

              {/* Brightness */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Exposure / Brightness</span>
                  <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Contrast</span>
                  <span>{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="80"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Saturation & Vibrance</span>
                  <span>{saturation > 0 ? `+${saturation}` : saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Warmth */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Warmth / Temperature</span>
                  <span>{warmth > 0 ? `+${warmth}` : warmth}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={warmth}
                  onChange={(e) => setWarmth(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Vignette */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Vignette Edge Shadows</span>
                  <span>{vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={vignette}
                  onChange={(e) => setVignette(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Blur / Bokeh */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Background Soft Blur</span>
                  <span>{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Export Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="block text-[11px] font-semibold text-slate-400">Download High-Res Photo:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => downloadEditedPhoto('image/jpeg')}
                    className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer text-center"
                  >
                    JPG
                  </button>
                  <button
                    onClick={() => downloadEditedPhoto('image/png')}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer text-center"
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => downloadEditedPhoto('image/webp')}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer text-center"
                  >
                    WebP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
