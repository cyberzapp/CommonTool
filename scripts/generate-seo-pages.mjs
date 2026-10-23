import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const baseHtmlPath = path.join(distDir, 'index.html');

const ROUTES = [
  {
    routePath: 'tools/pdf-multitool',
    title: 'Free Online PDF Multi-Tool — Merge, Split, Compress, Convert & E-Sign PDFs | CommonTool',
    description: 'Merge, split, compress, extract pages, convert PDF to Word/Excel/PNG, and add e-signatures 100% locally in your browser with zero file uploads.',
  },
  {
    routePath: 'tools/pdf-organizer',
    title: 'PDF Watermark, Bates Numbering, Page Numbers, Rotate & Metadata Editor | CommonTool',
    description: 'Stamp diagonal watermarks, legal Bates numbers, and page numbers onto PDFs, rotate pages, and clean or edit PDF metadata locally in your browser.',
  },
  {
    routePath: 'tools/media-converter',
    title: 'Image Converter (PNG, JPG, WebP, SVG), HEIC to JPG & Audio/Video Trimmer | CommonTool',
    description: 'Convert images between PNG, JPG, WebP, and SVG, decode Apple HEIC photos to JPG/PNG, and trim or compress audio and video files locally.',
  },
  {
    routePath: 'tools/ocr-scanner',
    title: 'Online OCR Image to Text Scanner — Extract Text from Receipts & Notes | CommonTool',
    description: 'Instant client-side OCR text extraction from scanned documents, receipts, screenshots, and handwritten notes using WebAssembly.',
  },
  {
    routePath: 'tools/invoice-generator',
    title: 'Free Unbranded PDF Invoice & Receipt Generator (Multi-Currency & Tax) | CommonTool',
    description: 'Create and download clean, unbranded PDF invoices and payment receipts with customizable line items, taxes, discounts, and currency toggles.',
  },
  {
    routePath: 'tools/business-templates',
    title: 'NDA, Service Agreement, Quotation & Offer Letter Generator | CommonTool',
    description: 'Generate customized Mutual NDAs, Master Service Agreements, Commercial Quotation Sheets, and Employment Offer Letters with PDF & Word export.',
  },
  {
    routePath: 'tools/financial-calculators',
    title: 'Profit Margin, Markup, Compound Interest, Break-Even & GST/VAT Calculator | CommonTool',
    description: 'Interactive business & financial calculators: Profit Margin & Markup, Compound Interest with growth chart, Break-Even Point, and GST/VAT tax split.',
  },
  {
    routePath: 'tools/loan-emi-planner',
    title: 'Loan & Mortgage EMI Amortization Calculator & Freelance Rate Planner | CommonTool',
    description: 'Calculate monthly loan or mortgage EMI payments with extra prepayment savings and full CSV amortization tables, or plan your freelance hourly rate.',
  },
  {
    routePath: 'tools/branding-utilities',
    title: 'Custom SVG/PNG QR Code Generator, Color Palette Maker & Social Cropper | CommonTool',
    description: 'Create custom-colored SVG/PNG QR codes with center logos, generate harmonious brand color palettes, and crop images for Instagram, YouTube, and TikTok.',
  },
  {
    routePath: 'tools/citation-formatter',
    title: 'APA, MLA, IEEE & Chicago Citation & Bibliography Generator | CommonTool',
    description: 'Instant academic citation and bibliography generator supporting APA 7th, MLA 9th, IEEE, and Chicago 17th styles for journals, books, and websites.',
  },
  {
    routePath: 'tools/math-solver',
    title: 'Interactive Function Grapher, Equation Solver, Matrix & Unit Calculator | CommonTool',
    description: 'Plot multiple mathematical functions, solve quadratic and symbolic derivatives, compute matrix determinants and inverses, and convert scientific units.',
  },
  {
    routePath: 'tools/writing-aids',
    title: 'Word Counter, Reading Time Estimator, Diff Checker & Case Converter | CommonTool',
    description: 'Count words, characters, sentences, and reading time, compare text side-by-side with Diff Checker, and convert between camelCase, snake_case, and Title Case.',
  },
  {
    routePath: 'tools/markdown-studio',
    title: 'Online Markdown Editor & Live Previewer with HTML & PDF Export | CommonTool',
    description: 'Split-pane GitHub-Flavored Markdown editor and live previewer with formatting shortcuts and one-click standalone HTML and PDF export.',
  },
  {
    routePath: 'tools/data-workbench',
    title: 'CSV, Excel (.xlsx), JSON, SQL & Markdown Table Converter | CommonTool',
    description: 'Convert tabular datasets between CSV, Excel (.xlsx), JSON, SQL INSERT statements, and Markdown tables, and clean or deduplicate rows locally.',
  },
  {
    routePath: 'tools/pomodoro-timer',
    title: 'Pomodoro Focus Timer with WebAudio Rain, Pink Noise & Binaural Beats | CommonTool',
    description: 'Configurable Pomodoro interval timer with synthesized ambient soundscapes (Soft Rain, Deep Brown Noise, 10Hz Alpha Binaural Focus) that work 100% offline.',
  },
  {
    routePath: 'tools/scratchpad-checklist',
    title: 'Auto-Saving Browser Scratchpad & Priority Task Checklist | CommonTool',
    description: 'Client-side LocalStorage notepad and priority task checklist that auto-saves on every keystroke without requiring a login, plus optional cloud sync.',
  },
  {
    routePath: 'tools/privacy-security',
    title: 'Cryptographic Password Generator, Base64/SHA-256 & JSON Formatter | CommonTool',
    description: 'Generate high-entropy cryptographic passwords, encode/decode UTF-8 Base64 and SHA-256 digests, and validate or format JSON payloads locally.',
  },
  {
    routePath: 'tools/dev-diagnostics',
    title: 'JWT Token Inspector, Regex Live Tester, Cron Explainer & UUID Generator | CommonTool',
    description: 'Inspect JWT headers, claims, and expiration offline, test regular expressions with live capture groups, translate cron expressions, and batch-generate UUIDs.',
  },
  {
    routePath: 'category/documents',
    title: 'Document & File Utilities — PDF Multi-Tool, Watermarks, Media Converter & OCR | CommonTool',
    description: 'Zero-upload browser utilities for merging, splitting, watermarking, signing, and converting PDFs, HEIC/WebP images, audio/video clips, and OCR text extraction.',
  },
  {
    routePath: 'category/business',
    title: 'Business & Financial Tools — Unbranded Invoices, Legal Docs, Calculators & QR | CommonTool',
    description: 'Generate unbranded PDF invoices and receipts, NDAs, service agreements, profit margin, loan EMI & compound interest calculations, and vector SVG QR codes.',
  },
  {
    routePath: 'category/academic',
    title: 'Student, Academic & Data Tools — Citations, Math Grapher, Word Counter & CSV/Excel | CommonTool',
    description: 'Format APA/MLA/IEEE/Chicago citations, plot mathematical functions, solve equations and matrices, convert CSV/Excel/JSON/SQL, and export Markdown to PDF.',
  },
  {
    routePath: 'category/productivity',
    title: 'Daily Productivity & Developer Tools — Pomodoro Timer, Scratchpad, Crypto & JWT | CommonTool',
    description: 'Stay focused with a WebAudio Pomodoro timer, auto-saving local scratchpad, cryptographic password generator, JWT inspector, Regex tester, and Cron explainer.',
  },
  {
    routePath: 'donate',
    title: 'Support CommonTool — Keep Free, Private Web Utilities Alive | Donate via Razorpay',
    description: 'Support CommonTool with a heartfelt contribution via Razorpay. Help us keep all 18+ client-side tools 100% free, ad-free, and build our upcoming iOS and Android apps.',
  },
  {
    routePath: 'about',
    title: 'About CommonTool — Privacy-First Online Workspace & Free Utility Suite',
    description: 'Learn how CommonTool empowers students, freelancers, and businesses with 18+ professional document, financial, academic, and developer utilities that run locally in your browser.',
  },
  {
    routePath: 'security',
    title: 'Security & Zero-Upload Architecture — How CommonTool Protects Your Files',
    description: 'Detailed technical overview of CommonTool client-side WebAssembly, HTML5 Canvas, and Web Crypto execution model, plus optional Firebase user-scoped security.',
  },
  {
    routePath: 'privacy-policy',
    title: 'Privacy Policy — Zero File Upload Guarantee & Data Handling | CommonTool',
    description: 'Read the CommonTool Privacy Policy. Your documents, PDFs, images, and financial calculations are processed locally on your device and never uploaded to our servers.',
  },
  {
    routePath: 'terms-and-conditions',
    title: 'Terms & Conditions of Use — Free Commercial & Personal License | CommonTool',
    description: 'Terms and Conditions for using CommonTool free online utilities, unbranded invoice exports, and document templates.',
  },
  {
    routePath: 'faq',
    title: 'Frequently Asked Questions (FAQ) — CommonTool Online Utilities',
    description: 'Answers to common questions about CommonTool zero-upload privacy, offline PWA support, commercial use of invoices and QR codes, and browser compatibility.',
  },
  {
    routePath: 'help-and-support',
    title: 'Help Center & Technical Support — Troubleshooting & Guides | CommonTool',
    description: 'Get help with PDF processing, HEIC image conversion, OCR text scanning, offline PWA installation, and cloud workspace sync on CommonTool.',
  },
];

if (fs.existsSync(baseHtmlPath)) {
  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');
  for (const r of ROUTES) {
    const outDir = path.join(distDir, r.routePath);
    fs.mkdirSync(outDir, { recursive: true });
    const canonical = `https://commontool.web.app/${r.routePath}`;
    let html = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${r.title}</title>`)
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
        `<meta name="description" content="${r.description}" />\n    <link rel="canonical" href="${canonical}" />\n    <meta property="og:title" content="${r.title}" />\n    <meta property="og:description" content="${r.description}" />\n    <meta property="og:url" content="${canonical}" />`
      );
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  }
  console.log(`Pre-rendered ${ROUTES.length} static SEO route HTML files in dist/`);
}
