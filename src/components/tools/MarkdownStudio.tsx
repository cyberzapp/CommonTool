import React, { useState } from 'react';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import {
  FileCode2,
  Download,
  FileText,
  Bold,
  Italic,
  List,
  Code,
  Heading2,
} from 'lucide-react';

const DEFAULT_MD = `# CommonTool Research & Note Studio

Welcome to the **Live Split-Pane Markdown Studio**! Everything you type on the left is rendered in real time on the right and can be exported directly to standalone **HTML** or **PDF**.

## Key Architectural Highlights
- **Zero-Upload Processing**: Local execution in your browser.
- **Instant Export**: Download clean HTML5 or paginated PDF documents.
- **Academic & Technical Ready**: Supports tables, code blocks, and task lists.

### Performance Comparison Table
| Processing Mode | Server Cost | User Privacy | Latency |
| :--- | :--- | :--- | :--- |
| Cloud Upload API | High | Exposed | 800ms - 4s |
| **CommonTool Wasm** | **$0.00** | **100% Local** | **< 25ms** |

\`\`\`typescript
export function verifyPrivacy(payload: Uint8Array): boolean {
  return payload.byteLength > 0; // Stays inside browser memory
}
\`\`\`
`;

export const MarkdownStudio: React.FC = () => {
  const [markdown, setMarkdown] = useState(DEFAULT_MD);

  const renderedHtml = marked.parse(markdown, { async: false }) as string;

  const insertSnippet = (snippet: string) => {
    setMarkdown((prev) => `${prev}\n${snippet}`);
  };

  const exportStandaloneHtml = () => {
    const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CommonTool Markdown Export</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 780px; margin: 40px auto; padding: 0 20px; line-height: 1.65; color: #0f172a; }
    pre, code { background: #f1f5f9; border-radius: 6px; padding: 2px 6px; font-family: monospace; }
    pre { padding: 14px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CommonTool-Document.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdownPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const lines = markdown.split('\n');
    let y = 55;

    for (const rawLine of lines) {
      if (y > pageH - 55) {
        doc.addPage();
        y = 55;
      }
      if (rawLine.startsWith('# ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(rawLine.replace('# ', ''), 45, y);
        y += 26;
      } else if (rawLine.startsWith('## ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(rawLine.replace('## ', ''), 45, y);
        y += 22;
      } else if (rawLine.startsWith('### ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(rawLine.replace('### ', ''), 45, y);
        y += 18;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        const clean = rawLine.replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(clean || ' ', pageW - 90);
        doc.text(wrapped, 45, y);
        y += wrapped.length * 14 + 4;
      }
    }
    doc.save('CommonTool-Markdown-Note.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileCode2 className="w-6 h-6 text-purple-400" />
            Markdown Previewer & Document Studio
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Write GitHub-Flavored Markdown with live split-pane preview and one-click HTML or PDF export.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportStandaloneHtml}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-purple-400" />
            Export HTML
          </button>
          <button
            onClick={exportMarkdownPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2">
        <button
          onClick={() => insertSnippet('## Section Heading')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
        >
          <Heading2 className="w-3.5 h-3.5" /> Heading
        </button>
        <button
          onClick={() => insertSnippet('**Bold Emphasis**')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" /> Bold
        </button>
        <button
          onClick={() => insertSnippet('*Italic Note*')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" /> Italic
        </button>
        <button
          onClick={() => insertSnippet('- Bullet item 1\n- Bullet item 2')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
        >
          <List className="w-3.5 h-3.5" /> List
        </button>
        <button
          onClick={() => insertSnippet('```js\nconsole.log("CommonTool");\n```')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
        >
          <Code className="w-3.5 h-3.5" /> Code Block
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-slate-400">Markdown Source</label>
          <textarea
            rows={18}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-[460px] rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-100 font-mono-code leading-relaxed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            Live Rendered Document Preview
          </label>
          <div
            className="w-full h-[460px] overflow-auto rounded-2xl bg-white text-slate-900 p-6 prose prose-slate max-w-none text-sm leading-relaxed shadow-inner"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>
    </div>
  );
};
