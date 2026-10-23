export type ToolCategoryId =
  | 'all'
  | 'documents'
  | 'business'
  | 'academic'
  | 'productivity';

export type ToolId =
  | 'pdf-multitool'
  | 'pdf-organizer'
  | 'media-converter'
  | 'ocr-scanner'
  | 'invoice-generator'
  | 'business-templates'
  | 'financial-calculators'
  | 'loan-emi-planner'
  | 'branding-utilities'
  | 'citation-formatter'
  | 'math-solver'
  | 'data-workbench'
  | 'writing-aids'
  | 'markdown-studio'
  | 'pomodoro-timer'
  | 'scratchpad-checklist'
  | 'privacy-security'
  | 'dev-diagnostics';

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolMetadata {
  id: ToolId;
  path: string;
  title: string;
  shortTitle: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  category: Exclude<ToolCategoryId, 'all'>;
  categoryLabel: string;
  description: string;
  badges: string[];
  accent: string;
  zeroUpload: boolean;
  steps: string[];
  faqs: ToolFaq[];
  relatedTools: ToolId[];
}

export const TOOLS_CATALOG: ToolMetadata[] = [
  // 1. Document & File Utilities (4 suites)
  {
    id: 'pdf-multitool',
    path: '/tools/pdf-multitool',
    title: 'PDF Multi-Tool Suite',
    shortTitle: 'PDF Multi-Tool',
    seoTitle: 'Free Online PDF Multi-Tool — Merge, Split, Compress, Convert & E-Sign PDFs | CommonTool',
    seoDescription:
      'Merge, split, compress, extract pages, convert PDF to Word/Excel/PNG, and add e-signatures 100% locally in your browser with zero file uploads.',
    keywords: ['merge pdf', 'split pdf', 'compress pdf', 'pdf to word', 'pdf to excel', 'sign pdf online'],
    category: 'documents',
    categoryLabel: 'Documents & Files',
    description:
      'Merge, split, compress, extract pages, convert (PDF ↔ Word/Excel/PNG), and add e-signatures privately in your browser.',
    badges: ['Merge & Split', 'PDF ↔ Word/Excel/PNG', 'E-Sign', 'Compress'],
    accent: 'from-rose-500 to-orange-500',
    zeroUpload: true,
    steps: [
      'Select your PDF file(s) or click "Load 3-Page Sample PDF" to test immediately.',
      'Choose Merge, Split, Compress, Convert (Word/Excel/PNG), or E-Sign.',
      'Download your processed PDF or ZIP archive directly to your device.',
    ],
    faqs: [
      {
        question: 'Are my PDF files uploaded to any external server?',
        answer:
          'No. CommonTool processes PDFs locally inside your browser memory so your documents never leave your device.',
      },
      {
        question: 'Can I draw my own e-signature on mobile or desktop?',
        answer:
          'Yes. Draw your signature using a mouse or touchscreen finger, or type a cursive signature and place it on any page.',
      },
    ],
    relatedTools: ['pdf-organizer', 'ocr-scanner', 'invoice-generator'],
  },
  {
    id: 'pdf-organizer',
    path: '/tools/pdf-organizer',
    title: 'PDF Watermark, Bates & Metadata Studio',
    shortTitle: 'PDF Watermark & Bates',
    seoTitle: 'Add Watermark to PDF, Page Numbers, Bates Stamping & Edit PDF Metadata | CommonTool',
    seoDescription:
      'Stamp custom diagonal watermarks, add Page X of Y or legal Bates numbering, rotate PDF pages, and edit document metadata locally.',
    keywords: ['watermark pdf', 'add page numbers to pdf', 'bates numbering pdf', 'rotate pdf', 'edit pdf metadata'],
    category: 'documents',
    categoryLabel: 'Documents & Files',
    description:
      'Stamp custom diagonal watermarks, add Page X of Y or legal Bates numbers, rotate pages, and edit PDF metadata.',
    badges: ['Diagonal Watermark', 'Bates Numbering', 'Rotate Pages', 'Metadata Editor'],
    accent: 'from-indigo-500 to-blue-500',
    zeroUpload: true,
    steps: [
      'Upload a PDF document or click "Load Sample PDF".',
      'Configure your diagonal watermark text, page/Bates numbering format, rotation angle, or XMP metadata fields.',
      'Click Download to save the stamped PDF immediately.',
    ],
    faqs: [
      {
        question: 'What is Legal Bates Numbering?',
        answer:
          'Bates numbering stamps sequential identifiers (such as EXHIBIT-0001, EXHIBIT-0002) onto each page for legal, medical, and commercial indexing.',
      },
    ],
    relatedTools: ['pdf-multitool', 'business-templates', 'ocr-scanner'],
  },
  {
    id: 'media-converter',
    path: '/tools/media-converter',
    title: 'Format & Media Converters',
    shortTitle: 'Media Converters',
    seoTitle: 'Image Converter (PNG, JPG, WebP, SVG), HEIC to JPG & Audio/Video Trimmer | CommonTool',
    seoDescription:
      'Convert images between PNG, JPG, WebP, and SVG, decode Apple HEIC photos to JPG/PNG, and trim or compress audio and video files locally.',
    keywords: ['png to webp', 'heic to jpg', 'svg converter', 'audio trimmer', 'video compressor'],
    category: 'documents',
    categoryLabel: 'Documents & Files',
    description:
      'Convert images (.png, .jpg, .webp, .svg), decode iPhone HEIC photos to JPG, and trim or compress audio & video.',
    badges: ['PNG/JPG/WebP/SVG', 'HEIC to JPG', 'Audio/Video Trimmer'],
    accent: 'from-amber-500 to-yellow-500',
    zeroUpload: true,
    steps: [
      'Select Image Converter, HEIC-to-JPG Decoder, or Audio/Video Trimmer.',
      'Adjust quality, dimensions, or start/end trim timestamps.',
      'Download the converted image or trimmed media clip with zero upload wait time.',
    ],
    faqs: [
      {
        question: 'How does HEIC-to-JPG work without uploading my photos?',
        answer:
          'CommonTool runs libheif compiled to WebAssembly inside your browser to decode Apple HEIC/HEIF photos locally.',
      },
    ],
    relatedTools: ['pdf-multitool', 'branding-utilities', 'ocr-scanner'],
  },
  {
    id: 'ocr-scanner',
    path: '/tools/ocr-scanner',
    title: 'OCR / Image-to-Text Scanner',
    shortTitle: 'OCR Image-to-Text',
    seoTitle: 'Online OCR Image to Text Scanner — Extract Text from Receipts & Notes | CommonTool',
    seoDescription:
      'Instant client-side OCR text extraction from scanned documents, receipts, screenshots, and handwritten notes using WebAssembly.',
    keywords: ['ocr online', 'image to text', 'receipt scanner', 'extract text from image'],
    category: 'documents',
    categoryLabel: 'Documents & Files',
    description:
      'Instant text extraction from scanned documents, receipts, screenshots, and notes with adaptive contrast enhancement.',
    badges: ['Tesseract Wasm', 'Contrast Boost', 'TXT Export'],
    accent: 'from-emerald-500 to-teal-500',
    zeroUpload: true,
    steps: [
      'Upload a screenshot, receipt, or photo — or click "Scan Sample Receipt".',
      'Keep Auto Contrast & Adaptive Binarization enabled for sharp character recognition.',
      'Copy the extracted text or export directly as a .TXT file.',
    ],
    faqs: [
      {
        question: 'Is confidential receipt or contract text kept private?',
        answer:
          'Yes. The Tesseract WebAssembly OCR worker runs inside your browser tab with zero server transmission.',
      },
    ],
    relatedTools: ['pdf-multitool', 'markdown-studio', 'writing-aids'],
  },

  // 2. Business & Financial Essentials (5 suites)
  {
    id: 'invoice-generator',
    path: '/tools/invoice-generator',
    title: 'Invoice & Receipt Generator',
    shortTitle: 'Invoices & Receipts',
    seoTitle: 'Free Unbranded PDF Invoice & Receipt Generator (Multi-Currency & Tax) | CommonTool',
    seoDescription:
      'Create and download clean, unbranded PDF invoices and payment receipts with customizable line items, taxes, discounts, and currency toggles.',
    keywords: ['invoice generator', 'receipt maker', 'unbranded pdf invoice', 'freelance invoice template'],
    category: 'business',
    categoryLabel: 'Business & Finance',
    description:
      'Clean, unbranded PDF export with customizable line items, multi-currency toggles, tax/discount fields, and saved templates.',
    badges: ['Unbranded PDF', 'Multi-Currency', 'Tax & Discounts'],
    accent: 'from-indigo-500 to-blue-500',
    zeroUpload: true,
    steps: [
      'Toggle between INVOICE and RECEIPT mode and select your currency ($, €, £, ₹, ¥).',
      'Enter sender/client details, line items, tax rate, and discount.',
      'Click "Export Unbranded PDF" for an instant, watermark-free PDF.',
    ],
    faqs: [
      {
        question: 'Does the exported PDF contain any CommonTool watermarks or branding?',
        answer:
          'Never. Every exported invoice and receipt is 100% clean and unbranded so you can send it directly to clients.',
      },
    ],
    relatedTools: ['business-templates', 'financial-calculators', 'loan-emi-planner'],
  },
  {
    id: 'business-templates',
    path: '/tools/business-templates',
    title: 'Business & Legal Document Templates',
    shortTitle: 'Legal & Biz Docs',
    seoTitle: 'NDA, Service Agreement, Quotation & Offer Letter Generator | CommonTool',
    seoDescription:
      'Generate customized Mutual NDAs, Master Service Agreements, Commercial Quotation Sheets, and Employment Offer Letters with PDF & Word export.',
    keywords: ['nda generator', 'service agreement template', 'quotation generator', 'offer letter template'],
    category: 'business',
    categoryLabel: 'Business & Finance',
    description:
      'Generate tailored NDAs, Service Agreements, Price Quotation Sheets, and Employment Offer Letters with PDF & Word export.',
    badges: ['NDA', 'Service Agreement', 'Quotation', 'Offer Letter'],
    accent: 'from-blue-500 to-cyan-500',
    zeroUpload: true,
    steps: [
      'Choose Mutual NDA, Service Agreement, Quotation Sheet, or Offer Letter.',
      'Fill in party names, effective date, compensation/fees, and governing jurisdiction.',
      'Export formatted copy as a PDF or editable Word (.DOC) file.',
    ],
    faqs: [
      {
        question: 'Can I edit the generated documents in Microsoft Word or Google Docs?',
        answer:
          'Yes, click "Export Word (.DOC)" to download a clean document compatible with Word, Google Docs, and Apple Pages.',
      },
    ],
    relatedTools: ['invoice-generator', 'pdf-multitool', 'pdf-organizer'],
  },
  {
    id: 'financial-calculators',
    path: '/tools/financial-calculators',
    title: 'Financial Calculators Suite',
    shortTitle: 'Margin, Compound & GST',
    seoTitle: 'Profit Margin, Markup, Compound Interest, Break-Even & GST/VAT Calculator | CommonTool',
    seoDescription:
      'Interactive business & financial calculators: Profit Margin & Markup, Compound Interest with growth chart, Break-Even Point, and GST/VAT tax split.',
    keywords: ['profit margin calculator', 'markup calculator', 'compound interest calculator', 'break even calculator', 'gst calculator'],
    category: 'business',
    categoryLabel: 'Business & Finance',
    description:
      'Profit margin, markup, compound interest with visual growth charts, break-even point, and GST/VAT tax split calculators.',
    badges: ['Margin & Markup', 'Compound Interest', 'Break-Even', 'GST/VAT'],
    accent: 'from-teal-500 to-emerald-500',
    zeroUpload: true,
    steps: [
      'Pick Margin & Markup, Compound Interest, Break-Even Analysis, or GST/VAT.',
      'Adjust cost, revenue, interest rate, or tax slab sliders.',
      'Inspect real-time unit economics, CGST/SGST splits, and multi-year growth charts.',
    ],
    faqs: [
      {
        question: 'What is the difference between Profit Margin and Markup?',
        answer:
          'Profit Margin is Gross Profit divided by Selling Price, while Markup is Gross Profit divided by Cost of Goods.',
      },
    ],
    relatedTools: ['loan-emi-planner', 'invoice-generator', 'data-workbench'],
  },
  {
    id: 'loan-emi-planner',
    path: '/tools/loan-emi-planner',
    title: 'Loan EMI & Freelance Rate Planner',
    shortTitle: 'Loan EMI & Rate Planner',
    seoTitle: 'Loan & Mortgage EMI Amortization Calculator & Freelance Hourly Rate Planner | CommonTool',
    seoDescription:
      'Calculate monthly loan and mortgage EMI payments with a downloadable CSV amortization schedule, or compute your target freelance hourly and daily rate.',
    keywords: ['loan emi calculator', 'mortgage amortization schedule', 'freelance hourly rate calculator', 'consulting rate calculator'],
    category: 'business',
    categoryLabel: 'Business & Finance',
    description:
      'Calculate mortgage/loan EMIs with yearly CSV amortization schedules or determine your freelance billable hourly rate.',
    badges: ['Loan EMI', 'Amortization CSV', 'Freelance Rate'],
    accent: 'from-emerald-500 to-teal-500',
    zeroUpload: true,
    steps: [
      'Enter loan principal, annual interest rate, and tenure in years to compute your exact monthly EMI.',
      'Review the year-by-year Principal vs Interest table and export to CSV.',
      'Switch to Freelance Hourly Rate to calculate billable hourly and daily rates from your target income.',
    ],
    faqs: [
      {
        question: 'Can I download the loan amortization schedule for Excel?',
        answer:
          'Yes! Click "Export Schedule (.CSV)" to open the yearly principal and interest breakdown in Excel or Google Sheets.',
      },
    ],
    relatedTools: ['financial-calculators', 'invoice-generator', 'business-templates'],
  },
  {
    id: 'branding-utilities',
    path: '/tools/branding-utilities',
    title: 'Branding & Social Studio',
    shortTitle: 'Branding & QR Studio',
    seoTitle: 'Custom SVG/PNG QR Code Generator, Color Palette Maker & Social Cropper | CommonTool',
    seoDescription:
      'Create custom-colored SVG/PNG QR codes with center logos, generate harmonious brand color palettes, and crop images for Instagram, YouTube, and TikTok.',
    keywords: ['qr code generator svg', 'color palette generator', 'social media image cropper', 'aspect ratio cropper'],
    category: 'business',
    categoryLabel: 'Business & Finance',
    description:
      'Custom SVG/PNG QR code generator with logos & colors, harmony color palette generator, and social media aspect-ratio cropper.',
    badges: ['QR Code SVG/PNG', 'Color Palettes', 'Social Cropper'],
    accent: 'from-fuchsia-500 to-pink-500',
    zeroUpload: true,
    steps: [
      'Enter any URL or text to render a high-error-correction QR code with custom colors and logo monogram.',
      'Switch to Color Palettes to generate Analogous, Complementary, or Triadic hex swatches.',
      'Use the Social Cropper to frame 1:1, 9:16, 16:9, or 4:5 visuals.',
    ],
    faqs: [
      {
        question: 'Can I download vector SVG QR codes for print design?',
        answer:
          'Yes. Both high-resolution PNG and scalable vector SVG exports are included free with zero tracking redirects.',
      },
    ],
    relatedTools: ['media-converter', 'invoice-generator', 'pdf-multitool'],
  },

  // 3. Student & Academic Workhorses (5 suites)
  {
    id: 'citation-formatter',
    path: '/tools/citation-formatter',
    title: 'Citation & Bibliography Formatter',
    shortTitle: 'Citation Formatter',
    seoTitle: 'APA, MLA, IEEE & Chicago Citation & Bibliography Generator | CommonTool',
    seoDescription:
      'Instant academic citation and bibliography generator supporting APA 7th, MLA 9th, IEEE, and Chicago 17th styles for journals, books, and websites.',
    keywords: ['apa citation generator', 'mla citation formatter', 'ieee reference generator', 'chicago style citation'],
    category: 'academic',
    categoryLabel: 'Student & Academic',
    description:
      'Instant academic reference generator supporting APA 7th, MLA 9th, IEEE, and Chicago 17th styles with bibliography export.',
    badges: ['APA • MLA • IEEE • Chicago', 'In-Text & Bib'],
    accent: 'from-violet-500 to-purple-500',
    zeroUpload: true,
    steps: [
      'Select APA 7th, MLA 9th, IEEE, or Chicago 17th citation style.',
      'Enter author name, publication year, title, journal/publisher, and DOI/URL.',
      'Copy the formatted entry and in-text citation or save to your compiled bibliography.',
    ],
    faqs: [
      {
        question: 'Does it generate both full bibliography references and in-text citations?',
        answer:
          'Yes, every source generates both the complete reference entry and the matching parenthetical or bracketed in-text citation.',
      },
    ],
    relatedTools: ['writing-aids', 'markdown-studio', 'math-solver'],
  },
  {
    id: 'math-solver',
    path: '/tools/math-solver',
    title: 'Math Solver, Matrix & Grapher',
    shortTitle: 'Math & Grapher',
    seoTitle: 'Interactive Function Grapher, Equation Solver, Matrix & Unit Calculator | CommonTool',
    seoDescription:
      'Plot multiple mathematical functions, solve quadratic and symbolic derivatives, compute matrix determinants and inverses, and convert scientific units.',
    keywords: ['function grapher online', 'equation solver', 'symbolic derivative calculator', 'matrix calculator', 'unit converter'],
    category: 'academic',
    categoryLabel: 'Student & Academic',
    description:
      'Step-by-step equation solver, symbolic evaluator, matrix calculator, unit converter, and multi-function interactive grapher.',
    badges: ['Equation Solver', 'Matrix & Units', 'Function Grapher'],
    accent: 'from-cyan-500 to-sky-500',
    zeroUpload: true,
    steps: [
      'Enter f(x) and g(x) expressions to plot interactive curves and inspect coordinates.',
      'Use the Equation & Derivative tab for quadratic roots and symbolic differentiation.',
      'Switch to Matrix Operations or Scientific Unit Converter for instant calculations.',
    ],
    faqs: [
      {
        question: 'Can I export my plotted mathematical function graph as an image?',
        answer:
          'Yes, click "Export Graph PNG" to download a high-contrast PNG image of your plotted curves for lab reports or slides.',
      },
    ],
    relatedTools: ['data-workbench', 'financial-calculators', 'citation-formatter'],
  },
  {
    id: 'data-workbench',
    path: '/tools/data-workbench',
    title: 'CSV, Excel, JSON & SQL Data Workbench',
    shortTitle: 'CSV / Excel / SQL Lab',
    seoTitle: 'Convert CSV to Excel (XLSX), JSON, SQL Insert & Markdown Table | CommonTool',
    seoDescription:
      'Convert datasets between CSV, Excel (.xlsx), JSON, SQL INSERT statements, and Markdown tables with 1-click duplicate row removal.',
    keywords: ['csv to excel', 'csv to json', 'csv to sql insert', 'csv to markdown table', 'remove duplicate rows csv'],
    category: 'academic',
    categoryLabel: 'Student & Academic',
    description:
      'Convert datasets between CSV, Excel (.xlsx), JSON, SQL INSERT statements, and Markdown tables with duplicate removal.',
    badges: ['CSV ↔ XLSX', 'SQL Generator', 'Markdown Table', 'Deduplicate'],
    accent: 'from-emerald-500 to-cyan-500',
    zeroUpload: true,
    steps: [
      'Paste CSV/JSON data or upload a .CSV or .XLSX spreadsheet.',
      'Click "Remove Duplicate Rows" to clean your dataset and preview it in the interactive grid.',
      'Download as an Excel (.XLSX) workbook or copy as JSON, SQL INSERT statements, or a Markdown table.',
    ],
    faqs: [
      {
        question: 'Can I convert a JSON array directly into an Excel (.xlsx) spreadsheet?',
        answer:
          'Yes! Paste any JSON array of objects or CSV text and click "Download Excel (.XLSX)" to generate a native spreadsheet.',
      },
    ],
    relatedTools: ['math-solver', 'privacy-security', 'markdown-studio'],
  },
  {
    id: 'writing-aids',
    path: '/tools/writing-aids',
    title: 'Writing & Research Aids',
    shortTitle: 'Word Count, Diff & Case',
    seoTitle: 'Word Counter, Reading Time Estimator, Diff Checker & Case Converter | CommonTool',
    seoDescription:
      'Count words, characters, sentences, and reading time, compare text side-by-side with Diff Checker, and convert between camelCase, snake_case, and Title Case.',
    keywords: ['word counter', 'reading time calculator', 'text diff checker', 'camelcase to snake_case converter'],
    category: 'academic',
    categoryLabel: 'Student & Academic',
    description:
      'Word/character counter with reading time estimation, side-by-side text diff-checker, and 8-mode case converter.',
    badges: ['Reading Time', 'Diff Checker', 'camelCase / snake_case'],
    accent: 'from-sky-500 to-indigo-500',
    zeroUpload: true,
    steps: [
      'Paste your draft into Word Counter for instant word, character, sentence, and reading/speaking time metrics.',
      'Use Diff-Checker to highlight word-by-word or line-by-line additions and deletions.',
      'Use Case Converter to transform strings into camelCase, PascalCase, snake_case, kebab-case, and more.',
    ],
    faqs: [
      {
        question: 'How is reading and speaking time estimated?',
        answer:
          'Reading time uses the standard 225 words-per-minute benchmark, while speaking time uses 140 words-per-minute.',
      },
    ],
    relatedTools: ['markdown-studio', 'citation-formatter', 'ocr-scanner'],
  },
  {
    id: 'markdown-studio',
    path: '/tools/markdown-studio',
    title: 'Markdown Reference & Note Studio',
    shortTitle: 'Markdown Studio',
    seoTitle: 'Online Markdown Editor & Live Previewer with HTML & PDF Export | CommonTool',
    seoDescription:
      'Split-pane GitHub-Flavored Markdown editor and live previewer with formatting shortcuts and one-click standalone HTML and PDF export.',
    keywords: ['markdown editor online', 'markdown to pdf', 'markdown to html', 'live markdown preview'],
    category: 'academic',
    categoryLabel: 'Student & Academic',
    description:
      'Split-pane live Markdown editor and previewer with GFM tables, checklists, and direct standalone HTML & PDF export.',
    badges: ['Live Split Preview', 'HTML Export', 'PDF Export'],
    accent: 'from-purple-500 to-indigo-500',
    zeroUpload: true,
    steps: [
      'Write or paste Markdown in the left pane using the quick formatting toolbar.',
      'Preview rendered tables, headings, and code blocks live in the right pane.',
      'Click "Export HTML" or "Export PDF" to download a standalone document.',
    ],
    faqs: [
      {
        question: 'Does the HTML export include clean typography styles?',
        answer:
          'Yes, exported HTML files include embedded responsive CSS for tables, code blocks, and typography.',
      },
    ],
    relatedTools: ['writing-aids', 'scratchpad-checklist', 'citation-formatter'],
  },

  // 4. Daily Productivity & Operations (4 suites)
  {
    id: 'pomodoro-timer',
    path: '/tools/pomodoro-timer',
    title: 'Pomodoro & Ambient Focus Timer',
    shortTitle: 'Pomodoro & Ambient',
    seoTitle: 'Pomodoro Focus Timer with WebAudio Rain, Pink Noise & Binaural Beats | CommonTool',
    seoDescription:
      'Configurable Pomodoro interval timer with synthesized ambient soundscapes (Soft Rain, Deep Brown Noise, 10Hz Alpha Binaural Focus) that work 100% offline.',
    keywords: ['pomodoro timer online', 'ambient noise generator', 'brown noise timer', 'binaural beats focus'],
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description:
      'Configurable interval timer with Web Audio API synthesized ambient soundscapes (Rain, Pink/Brown Noise, Binaural Focus).',
    badges: ['Custom Intervals', 'WebAudio Ambient', 'Session Tracker'],
    accent: 'from-orange-500 to-red-500',
    zeroUpload: true,
    steps: [
      'Configure your preferred Focus, Short Break, and Long Break durations.',
      'Toggle synthesized Soft Rain, Deep Brown Noise, or 10Hz Alpha Focus Drone.',
      'Track completed focus sessions with automatic acoustic completion chimes.',
    ],
    faqs: [
      {
        question: 'Do the ambient sounds stream large audio files over the internet?',
        answer:
          'No! All soundscapes are synthesized mathematically in real time using the browser Web Audio API, consuming zero bandwidth.',
      },
    ],
    relatedTools: ['scratchpad-checklist', 'markdown-studio', 'writing-aids'],
  },
  {
    id: 'scratchpad-checklist',
    path: '/tools/scratchpad-checklist',
    title: 'Quick Scratchpad & Checklist',
    shortTitle: 'Scratchpad & Tasks',
    seoTitle: 'Auto-Saving Browser Scratchpad & Priority Task Checklist | CommonTool',
    seoDescription:
      'Client-side LocalStorage notepad and priority task checklist that auto-saves on every keystroke without requiring a login, plus optional cloud sync.',
    keywords: ['online scratchpad', 'browser notepad autosave', 'quick checklist', 'local storage notes'],
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description:
      'Auto-saving client-side local storage notepad and priority task checklist with zero login required + optional Cloud Sync.',
    badges: ['Instant Auto-Save', 'Multi-Note', 'Priority Checklist'],
    accent: 'from-lime-500 to-emerald-500',
    zeroUpload: true,
    steps: [
      'Create multiple notes and type freely — every keystroke saves to LocalStorage immediately.',
      'Add tasks with High, Medium, or Low priority badges in the Action Checklist.',
      'Optionally connect Cloud Sync only if you want cross-device backup.',
    ],
    faqs: [
      {
        question: 'Will my notes still be here if I close the browser tab?',
        answer:
          'Yes! Notes and checklist items persist in your browser LocalStorage automatically without needing an account.',
      },
    ],
    relatedTools: ['pomodoro-timer', 'markdown-studio', 'privacy-security'],
  },
  {
    id: 'privacy-security',
    path: '/tools/privacy-security',
    title: 'Privacy & Security Utilities',
    shortTitle: 'Passwords, Base64 & JSON',
    seoTitle: 'Cryptographic Password Generator, Base64/SHA-256 & JSON Formatter | CommonTool',
    seoDescription:
      'Generate high-entropy cryptographic passwords, encode/decode UTF-8 Base64 and SHA-256 digests, and validate or format JSON payloads locally.',
    keywords: ['password generator crypto', 'base64 encoder decoder', 'sha256 hash generator', 'json formatter validator'],
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description:
      'Cryptographic password generator with entropy meter, UTF-8 Base64/SHA-256 tool, and JSON formatter & validator.',
    badges: ['Crypto Passwords', 'Base64 & SHA-256', 'JSON Validator'],
    accent: 'from-slate-500 to-zinc-500',
    zeroUpload: true,
    steps: [
      'Use Web Crypto CSPRNG to generate passwords up to 64 characters with live bit-entropy calculation.',
      'Switch to Base64 & SHA-256 to encode/decode UTF-8 strings and compute cryptographic hashes.',
      'Use JSON Formatter & Validator to pretty-print or minify JSON and pinpoint syntax errors.',
    ],
    faqs: [
      {
        question: 'How are passwords generated?',
        answer:
          'Passwords use window.crypto.getRandomValues() for true cryptographic randomness right inside your browser.',
      },
    ],
    relatedTools: ['dev-diagnostics', 'data-workbench', 'writing-aids'],
  },
  {
    id: 'dev-diagnostics',
    path: '/tools/dev-diagnostics',
    title: 'Developer & Web Diagnostics',
    shortTitle: 'JWT, Regex, Cron & UUID',
    seoTitle: 'JWT Token Decoder, Regex Tester, Cron Schedule Explainer & Bulk UUID Generator | CommonTool',
    seoDescription:
      'Inspect and decode JWT tokens offline, test regular expressions with capture groups, translate cron expressions, and generate bulk v4 UUIDs.',
    keywords: ['jwt decoder offline', 'regex tester online', 'cron expression explainer', 'bulk uuid generator'],
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description:
      'Offline JWT token claim inspector, live Regex tester with capture groups, Cron schedule translator, and bulk UUID v4 generator.',
    badges: ['JWT Inspector', 'Regex Lab', 'Cron Explainer', 'Bulk UUIDs'],
    accent: 'from-indigo-500 to-violet-500',
    zeroUpload: true,
    steps: [
      'Paste any JWT token to inspect decoded Header and Payload claims without sending secrets over the network.',
      'Test regular expressions and flags against sample text with real-time token highlighting.',
      'Translate 5-field Cron expressions into plain English or generate up to 50 cryptographic v4 UUIDs.',
    ],
    faqs: [
      {
        question: 'Why should I decode production JWT tokens locally?',
        answer:
          'Pasting live bearer tokens into server-backed websites risks leaking session credentials. CommonTool decodes JWTs 100% offline in your browser.',
      },
    ],
    relatedTools: ['privacy-security', 'data-workbench', 'writing-aids'],
  },
];

export interface CategoryMeta {
  id: Exclude<ToolCategoryId, 'all'>;
  path: string;
  label: string;
  shortLabel: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  subtitle: string;
}

export const CATEGORIES_CATALOG: CategoryMeta[] = [
  {
    id: 'documents',
    path: '/category/documents',
    label: 'Documents & Files',
    shortLabel: 'Files',
    seoTitle: 'Free Document & File Utilities — PDF Multi-Tool, Watermark, Media Converter & OCR | CommonTool',
    seoDescription:
      'Zero-upload browser utilities for merging, splitting, watermarking, signing, and converting PDFs, HEIC/WebP images, audio/video clips, and OCR text extraction.',
    headline: 'Document, PDF & Media Tools',
    subtitle: 'Merge, split, watermark, e-sign, and convert PDFs, images, and audio privately on your device.',
  },
  {
    id: 'business',
    path: '/category/business',
    label: 'Business & Finance',
    shortLabel: 'Business',
    seoTitle: 'Free Business & Financial Tools — Unbranded Invoices, Legal Docs, Calculators & QR | CommonTool',
    seoDescription:
      'Generate unbranded PDF invoices and receipts, NDAs, service agreements, loan EMI schedules, profit margin calculations, and vector SVG QR codes.',
    headline: 'Business, Invoicing & Financial Tools',
    subtitle: 'Create unbranded invoices, draft contracts, calculate margins & loan EMIs, and generate custom QR codes.',
  },
  {
    id: 'academic',
    path: '/category/academic',
    label: 'Student & Academic',
    shortLabel: 'Academic',
    seoTitle: 'Free Student & Academic Tools — Citation Generator, Math Grapher, Data Lab & Markdown | CommonTool',
    seoDescription:
      'Format APA/MLA/IEEE/Chicago citations, plot mathematical functions, convert CSV/Excel/SQL datasets, check text diffs, and export Markdown to PDF.',
    headline: 'Academic, Math, Data & Writing Tools',
    subtitle: 'Format citations, graph equations, convert CSV/Excel/SQL datasets, compare text diffs, and publish Markdown.',
  },
  {
    id: 'productivity',
    path: '/category/productivity',
    label: 'Daily Productivity',
    shortLabel: 'Daily',
    seoTitle: 'Free Productivity & Security Tools — Pomodoro Timer, Scratchpad, Crypto & JWT | CommonTool',
    seoDescription:
      'Stay focused with a WebAudio Pomodoro timer, auto-saving local scratchpad & checklist, cryptographic password generator, JWT decoder, and JSON validator.',
    headline: 'Daily Productivity & Developer Security',
    subtitle: 'Focus timers with ambient soundscapes, auto-saving notes, password generators, and developer diagnostics.',
  },
];
