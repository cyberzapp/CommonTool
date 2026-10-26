# CommonTool — Privacy-First, Zero-Upload Web Utility Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](./LICENSE)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20Zero--Upload-10b981.svg)](https://commontool.breathy.in/security)
[![Live App](https://img.shields.io/badge/Live-commontool.breathy.in-4f46e5.svg)](https://commontool.breathy.in)
[![Mobile Apps](https://img.shields.io/badge/Mobile%20Apps-iOS%20%26%20Android%20Coming%20Soon-f59e0b.svg)](https://commontool.breathy.in/about)

> **Our Core Intention: Privacy Matters Most.**
> Engineered by **Suman Das**, CommonTool is built on the firm principle that you should never have to upload confidential contracts, tax receipts, personal photos, or financial spreadsheets to a remote cloud server—or pay a monthly subscription—just to merge a PDF, extract text via OCR, generate an unbranded invoice, or format academic citations.

**CommonTool** ([commontool.breathy.in](https://commontool.breathy.in)) is the global gold standard for 100% free, zero-upload file processing featuring **18 unified workbenches** that execute directly inside the user's browser using **WebAssembly (Wasm)**, **HTML5 Canvas**, **Web Audio**, and **Web Crypto APIs**.

---

## 🌟 Core Architectural Principles

1. **Zero-Upload Client-Side Processing (`100% On-Device Privacy`)**:
   - Every PDF merge, split, watermark, e-signature, HEIC image decode, audio trim, and OCR text scan operates on local in-memory `ArrayBuffer` / `Uint8Array` streams inside the browser's isolated sandbox.
   - **Offline-Verifiable**: Load CommonTool, disconnect from Wi-Fi (or enable Airplane Mode), and run any tool—everything works offline.
2. **No Mandatory Sign-Up & Zero Watermarks**:
   - All 18 tool suites are immediately accessible without creating an account.
   - Every exported PDF, invoice, receipt, legal agreement, and QR code is **100% unbranded and watermark-free**.
3. **Optional Owner-Scoped Firebase Cloud Sync**:
   - Users who want to back up their scratchpad notes, checklists, saved invoices, or citations across devices can optionally sign in via **Firebase Authentication** (Email/Password, Google Sign-In, or One-Click Guest Sync) backed by strict owner-only **Cloud Firestore Security Rules** (`request.auth.uid == userId`).
4. **Minimal Light & Dark Mode + Installable PWA**:
   - Designed with a clean, high-contrast Light & Dark Mode interface, mobile bottom navigation bar, and a Progressive Web App (`manifest.webmanifest` + `sw.js`) for offline installation on iOS, Android, macOS, and Windows.
   - *Native iOS & Android apps are coming soon!*

---

## 🧰 Complete 18-Tool Catalog (with Dedicated SEO URLs)

Every tool has its own pre-rendered, Google-indexable route (`/tools/:toolId`) with structured JSON-LD (`SoftwareApplication` & `FAQPage` schema):

### 1. Document & File Utilities (`/category/documents`)
| Tool | Route | Capabilities |
| :--- | :--- | :--- |
| **PDF Multi-Tool** | `/tools/pdf-multitool` | Merge, split, compress, extract pages, convert PDF ↔ Word/Excel/PNG, and draw/type E-Signatures (`pdf-lib`, `pdfjs-dist`). |
| **PDF Watermark, Bates & Metadata** | `/tools/pdf-organizer` | Stamp diagonal/header watermarks, legal Bates numbering (`CONF-000001`), page numbers, rotate pages, and edit/strip PDF metadata. |
| **Format & Media Converter** | `/tools/media-converter` | Convert images (`.png`, `.jpg`, `.webp`, `.svg`), Apple `.heic` → `.jpg/.png` (`heic2any`), and trim/compress audio & video (`Web Audio API`). |
| **OCR Image-to-Text Scanner** | `/tools/ocr-scanner` | Extract editable text from scanned documents, receipts, screenshots, and notes with adaptive contrast preprocessing (`tesseract.js` Wasm). |

### 2. Business & Financial Essentials (`/category/business`)
| Tool | Route | Capabilities |
| :--- | :--- | :--- |
| **Invoice & Receipt Generator** | `/tools/invoice-generator` | Clean, unbranded vector PDF invoices & receipts with multi-currency (`$`, `€`, `£`, `₹`, `CA$`, `A$`, `¥`), tax, discount, and template saving (`jspdf`). |
| **Business Document Templates** | `/tools/business-templates` | Customizable Mutual NDAs, Master Service Agreements (MSA), Commercial Quotations, and Employment Offer Letters with PDF & Word (`.doc`) export. |
| **Financial Calculators** | `/tools/financial-calculators` | Profit Margin & Markup, Compound Interest with SVG growth chart, Break-Even Point, and Inclusive/Exclusive GST/VAT calculators. |
| **Loan EMI & Freelance Rate Planner** | `/tools/loan-emi-planner` | Mortgage/Loan EMI calculator with extra prepayment savings & CSV amortization schedule, plus Freelance Hourly Rate reverse-calculator. |
| **Branding & QR Studio** | `/tools/branding-utilities` | Custom-colored vector SVG/PNG QR Code generator with center logos (`qrcode`), Color Palette Harmony generator, and Social Media Aspect-Ratio Cropper. |

### 3. Student, Academic & Data Workhorses (`/category/academic`)
| Tool | Route | Capabilities |
| :--- | :--- | :--- |
| **Citation & Bibliography Formatter** | `/tools/citation-formatter` | Instant academic citations & exportable bibliographies in **APA 7th**, **MLA 9th**, **IEEE**, and **Chicago 17th** styles. |
| **Math Solver, Matrix & Grapher** | `/tools/math-solver` | Multi-function interactive canvas plotter, quadratic & symbolic derivative solver, $2\times2$/$3\times3$ matrix calculator, and unit converter (`mathjs`). |
| **CSV, Excel, JSON & SQL Workbench** | `/tools/data-workbench` | Convert datasets between CSV, Excel (`.xlsx`), JSON, SQL `INSERT`, and Markdown tables with duplicate row removal (`xlsx`). |
| **Writing & Research Aids** | `/tools/writing-aids` | Word/character/sentence counter with reading & speaking time, side-by-side Diff Checker (`diff`), and 8-mode Case Converter. |
| **Markdown Previewer & Studio** | `/tools/markdown-studio` | Split-pane GitHub-Flavored Markdown editor with live preview (`marked`) and standalone HTML & PDF export. |

### 4. Daily Productivity, Privacy & Developer Tools (`/category/productivity`)
| Tool | Route | Capabilities |
| :--- | :--- | :--- |
| **Pomodoro & Ambient Sound Timer** | `/tools/pomodoro-timer` | Configurable focus/break timer with real-time synthesized WebAudio soundscapes (*Soft Rain*, *Deep Brown Noise*, *10Hz Alpha Binaural Focus*). |
| **Quick Scratchpad & Checklist** | `/tools/scratchpad-checklist` | Instant auto-saving LocalStorage notepad and priority task checklist with zero login required. |
| **Privacy & Security Utilities** | `/tools/privacy-security` | Cryptographic password generator (`window.crypto.getRandomValues`), UTF-8 Base64 & SHA-256 hash generator, and JSON formatter/validator. |
| **Developer Diagnostics Suite** | `/tools/dev-diagnostics` | Offline JWT Token Inspector (headers, claims & expiration), Live Regex Tester with capture groups, Cron Schedule Explainer, and Bulk UUID v4 generator. |

---

## 🏛️ Trust, Legal, Support & Community Pages

- **Heartfelt Donate Page (`/donate`)**: Complete **Razorpay** payment integration (`rzp_test_RukOz4cBQyvFQE`) supporting INR (`₹`) and USD (`$`), order creation, HMAC-SHA256 signature verification, and instant downloadable **Official PDF Donation Receipts**.
- **About Us (`/about`)**: Mission statement, open-source philosophy, and mobile roadmap.
- **Security Architecture (`/security`)**: Technical whitepaper detailing the zero-upload browser sandbox and Firebase Firestore owner-scoped security rules.
- **Privacy Policy (`/privacy-policy`)**: Zero file upload guarantee, `localStorage` transparency, and GDPR/CCPA rights.
- **Terms & Conditions (`/terms-and-conditions`)**: Royalty-free commercial and personal licensing for all generated outputs.
- **FAQ (`/faq`)** & **Help & Support (`/help-and-support`)**: Searchable knowledge base and support ticket dispatcher connected to **`support@breathy.in`**, **`contact@breathy.in`**, and Firebase Firestore.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`

### 1. Clone the Repository
```bash
git clone https://github.com/cyberzapp/CommonTool.git
cd CommonTool
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build & Pre-Render All 29 Static SEO Routes
```bash
npm run build
```
This runs TypeScript type-checking (`tsc -b`), bundles the production application with Vite into `dist/`, and executes `scripts/generate-seo-pages.mjs` to generate 29 static route `index.html` files with custom `<title>`, `<meta name="description">`, `<link rel="canonical">`, and OpenGraph tags.

---

## ☁️ Deploying to Firebase Hosting (`commontool.breathy.in`)

CommonTool is deployed to **Firebase Hosting** (`commontool.breathy.in`), **Firebase Authentication**, and **Cloud Firestore** under project `memory-2b328`.

### One-Command Full Deployment
```bash
# Log in to Firebase CLI if not already authenticated
npx firebase-tools login

# Build & deploy Hosting (commontool.breathy.in), Cloud Functions, and Firestore Rules
npm run deploy:all
```

Or deploy individual targets:
- **Hosting only (`commontool.breathy.in`)**:
  ```bash
  npm run deploy:hosting
  ```
- **Cloud Functions (`razorpayApi`)**:
  ```bash
  npm run deploy:functions
  ```
- **Firestore Security Rules (`firestore.rules`)**:
  ```bash
  npm run deploy:rules
  ```

---

## 👨‍💻 Creator & Architectural Leadership

**CommonTool** was founded and engineered by **Suman Das** ([@cyberzapp](https://github.com/cyberzapp)), Founder & Lead Architect at [Breathy](https://breathy.in). Suman established CommonTool to provide a 100% private, sovereign alternative to centralized SaaS document converters that compromise user data.

---

## 🤝 Contributing to CommonTool

We welcome fellow developers, designers, and privacy advocates to contribute! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a Pull Request.

### Golden Rule for Contributors
> **Zero-Upload Privacy Guarantee**: Every file transformation or calculation tool added to CommonTool **must** execute 100% locally in the user's browser (via JavaScript, WebAssembly, Canvas, Web Audio, or Web Crypto). Never transmit user files or sensitive document contents to external servers.

---

## 📬 Contact & Support

- **Founder & Architect**: Suman Das ([GitHub: @cyberzapp](https://github.com/cyberzapp))
- **General Inquiries & Partnerships**: [contact@breathy.in](mailto:contact@breathy.in)
- **Technical Support & Bug Reports**: [support@breathy.in](mailto:support@breathy.in)
- **GitHub Repository**: [https://github.com/cyberzapp/CommonTool](https://github.com/cyberzapp/CommonTool)
- **Live Web App**: [https://commontool.breathy.in](https://commontool.breathy.in)

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.
