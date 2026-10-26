import { TOOLS_CATALOG, type ToolId } from '../types/tools';

export interface DownloadCompletionData {
  fileName: string;
  fileSize?: number; // bytes
  fileBlobUrl?: string; // Object URL for fallback re-downloading
  toolId: ToolId;
  toolTitle?: string;
  originalSize?: number; // bytes (e.g. before compression)
  compressedSize?: number; // bytes (after compression)
  compressionRatio?: number; // percentage, e.g. 78.5
  timeSavedMinutes?: number; // estimated minutes saved
  customMetricLabel?: string;
  customMetricValue?: string;
  completedAt?: string;
}

export interface ToolRecommendation {
  id: ToolId;
  title: string;
  description: string;
  category: string;
  badge: string;
}

// In-memory holder so object URLs survive navigation without serialization issues
let currentCompletionData: DownloadCompletionData | null = null;

export function getActiveDownloadData(): DownloadCompletionData | null {
  if (currentCompletionData) return currentCompletionData;
  try {
    const raw = sessionStorage.getItem('commontool_last_download');
    if (raw) return JSON.parse(raw) as DownloadCompletionData;
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export function triggerDownloadWithSuccessPage(data: DownloadCompletionData) {
  const tool = TOOLS_CATALOG.find((t) => t.id === data.toolId);
  const enrichedData: DownloadCompletionData = {
    ...data,
    toolTitle: data.toolTitle || tool?.title || 'CommonTool Workspace',
    completedAt: data.completedAt || new Date().toISOString(),
  };

  currentCompletionData = enrichedData;

  // Cache metadata in sessionStorage (omit long blob url to prevent storage quota limits)
  try {
    const storageCopy = { ...enrichedData };
    delete storageCopy.fileBlobUrl;
    sessionStorage.setItem('commontool_last_download', JSON.stringify(storageCopy));
  } catch {
    // Ignore sessionStorage error
  }

  // 1. Kick off instant browser download immediately
  if (data.fileBlobUrl && data.fileName) {
    const a = document.createElement('a');
    a.href = data.fileBlobUrl;
    a.download = data.fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 100);
  }

  // 2. Dispatch event so App.tsx transitions seamlessly to the /download-success view
  window.dispatchEvent(
    new CustomEvent('commontool-download-complete', {
      detail: enrichedData,
    })
  );
}

// Smart recommendation engine based on last used tool
export function getRecommendedTools(lastToolId: ToolId): ToolRecommendation[] {
  const recommendationsMap: Record<ToolId, ToolId[]> = {
    'pdf-multitool': ['pdf-organizer', 'ocr-scanner', 'media-converter'],
    'pdf-organizer': ['pdf-multitool', 'ocr-scanner', 'business-templates'],
    'media-converter': ['ocr-scanner', 'ai-solutions', 'branding-utilities'],
    'ocr-scanner': ['pdf-multitool', 'ai-solutions', 'writing-aids'],
    'invoice-generator': ['business-templates', 'financial-calculators', 'loan-emi-planner'],
    'business-templates': ['invoice-generator', 'pdf-multitool', 'pdf-organizer'],
    'financial-calculators': ['loan-emi-planner', 'invoice-generator', 'data-workbench'],
    'loan-emi-planner': ['financial-calculators', 'invoice-generator', 'pomodoro-timer'],
    'branding-utilities': ['media-converter', 'ai-solutions', 'writing-aids'],
    'citation-formatter': ['writing-aids', 'markdown-studio', 'math-solver'],
    'math-solver': ['financial-calculators', 'data-workbench', 'citation-formatter'],
    'writing-aids': ['ai-solutions', 'markdown-studio', 'citation-formatter'],
    'markdown-studio': ['writing-aids', 'pdf-multitool', 'data-workbench'],
    'data-workbench': ['financial-calculators', 'invoice-generator', 'markdown-studio'],
    'pomodoro-timer': ['scratchpad-checklist', 'writing-aids', 'privacy-security'],
    'scratchpad-checklist': ['pomodoro-timer', 'writing-aids', 'markdown-studio'],
    'privacy-security': ['dev-diagnostics', 'pdf-organizer', 'scratchpad-checklist'],
    'dev-diagnostics': ['privacy-security', 'data-workbench', 'markdown-studio'],
    'ai-solutions': ['pdf-multitool', 'ocr-scanner', 'writing-aids'],
  };

  const suggestedIds = recommendationsMap[lastToolId] || [
    'pdf-multitool',
    'ocr-scanner',
    'media-converter',
  ];

  return suggestedIds
    .map((id) => {
      const tool = TOOLS_CATALOG.find((t) => t.id === id);
      if (!tool) return null;
      return {
        id: tool.id,
        title: tool.title,
        description: tool.description,
        category: tool.category,
        badge: tool.badges?.[0] || 'Popular',
      };
    })
    .filter(Boolean) as ToolRecommendation[];
}
