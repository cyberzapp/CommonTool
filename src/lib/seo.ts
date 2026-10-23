import {
  TOOLS_CATALOG,
  CATEGORIES_CATALOG,
  type ToolId,
  type ToolCategoryId,
} from '../types/tools';

const BASE_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'https://commontool.web.app';

export function updatePageSeo(route: {
  toolId: ToolId | null;
  categoryId: ToolCategoryId;
  pathname: string;
}) {
  const { toolId, categoryId, pathname } = route;
  const tool = toolId ? TOOLS_CATALOG.find((t) => t.id === toolId) : null;
  const cat =
    !tool && categoryId !== 'all'
      ? CATEGORIES_CATALOG.find((c) => c.id === categoryId)
      : null;

  const title = tool
    ? tool.seoTitle
    : cat
    ? cat.seoTitle
    : 'CommonTool — 18 Zero-Upload Client-Side Web Utilities (PDF, OCR, Invoice, Math & More)';

  const description = tool
    ? tool.seoDescription
    : cat
    ? cat.seoDescription
    : 'Free privacy-first browser utility suite: PDF Multi-Tool (merge, split, compress, convert, sign), HEIC & Media Converter, Wasm OCR, Unbranded Invoice Generator, Legal Templates, Financial Calculators, QR Studio, Citations, and Math Grapher.';

  const canonicalUrl = `${BASE_ORIGIN}${pathname === '/' ? '' : pathname}`;

  document.title = title;

  const setMeta = (selector: string, attr: string, content: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      if (selector.includes('property=')) {
        const prop = selector.match(/property="([^"]+)"/)?.[1];
        if (prop) el.setAttribute('property', prop);
      } else {
        const name = selector.match(/name="([^"]+)"/)?.[1];
        if (name) el.setAttribute('name', name);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, content);
  };

  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[property="og:type"]', 'content', 'website');

  if (tool) {
    setMeta('meta[name="keywords"]', 'content', tool.keywords.join(', '));
  }

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // Inject JSON-LD Structured Data for Google Search Rich Results
  let ldScript = document.getElementById('commontool-jsonld') as HTMLScriptElement | null;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'commontool-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }

  if (tool) {
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.title,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web Browser (Client-Side WebAssembly)',
        url: canonicalUrl,
        description: tool.seoDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: tool.faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      },
    ];
    ldScript.textContent = JSON.stringify(jsonLd);
  } else {
    const itemListLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'CommonTool Client-Side Web Utilities',
      description,
      itemListElement: TOOLS_CATALOG.map((t, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: t.title,
        url: `${BASE_ORIGIN}${t.path}`,
        description: t.seoDescription,
      })),
    };
    ldScript.textContent = JSON.stringify(itemListLd);
  }
}
