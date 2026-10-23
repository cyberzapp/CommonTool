# Contributing to CommonTool

Thank you for your interest in contributing to **CommonTool** ([https://github.com/cyberzapp/CommonTool](https://github.com/cyberzapp/CommonTool))!

Our mission is to build the world's most reliable, fast, and **privacy-first (100% client-side)** everyday software toolkit—completely free of paywalls, ads, and watermarks.

---

## 🛡️ The Non-Negotiable Privacy Rule

**Privacy Matters Most.** Every contribution to CommonTool must strictly adhere to our Zero-Upload Architecture:
1. **No Server-Side File Processing**: All PDFs, images, audio/video files, spreadsheets, and text documents must be processed in-memory inside the user's browser (`ArrayBuffer`, `Uint8Array`, WebAssembly, HTML5 Canvas, Web Audio, Web Crypto).
2. **No Telemetry or Third-Party Trackers**: Do not add analytics trackers, ad scripts, or fingerprinting libraries.
3. **No Watermarks**: All exported PDFs, images, invoices, and documents must remain 100% unbranded and watermark-free.
4. **Offline-Capable**: Whenever possible, tools should work even when the user disconnects from the internet.

---

## 🛠️ How to Add a New Tool Suite

1. **Create the Tool Component**:
   Add your React + TypeScript component in `src/components/tools/YourNewTool.tsx`. Ensure it works seamlessly in both **Light Mode** and **Dark Mode**.
2. **Register the Tool Metadata & SEO**:
   Add the new `ToolId` and SEO metadata (`path`, `title`, `seoTitle`, `seoDescription`, `keywords`, `howToSteps`, `faqs`) in [`src/types/tools.ts`](./src/types/tools.ts).
3. **Wire the Route**:
   Import and render your component inside `renderActiveTool()` in [`src/App.tsx`](./src/App.tsx).
4. **Add Static Pre-Rendering & Sitemap Entry**:
   Add the route to [`scripts/generate-seo-pages.mjs`](./scripts/generate-seo-pages.mjs) and [`public/sitemap.xml`](./public/sitemap.xml).
5. **Verify the Build**:
   ```bash
   npm run build
   ```
   Ensure there are zero TypeScript errors and all static SEO pages generate cleanly.

---

## 📬 Questions or Need Help?

Reach out to the maintainers anytime at:
- **Technical Support**: [support@breathy.in](mailto:support@breathy.in)
- **General Contact**: [contact@breathy.in](mailto:contact@breathy.in)
