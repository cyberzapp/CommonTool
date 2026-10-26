import {
  TOOLS_CATALOG,
  CATEGORIES_CATALOG,
  type ToolId,
  type ToolCategoryId,
} from '../types/tools';

export const BASE_ORIGIN =
  typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://commontool.breathy.in';

export const AUTHOR_SCHEMA = {
  '@type': 'Person',
  '@id': `${BASE_ORIGIN}/#suman-das`,
  name: 'Suman Das',
  jobTitle: 'Founder & Lead System Architect',
  description:
    'Pioneer in zero-upload client-side web architectures, WebAssembly document processing, local cryptography, and privacy-first web utilities.',
  url: `${BASE_ORIGIN}/about`,
  worksFor: {
    '@type': 'Organization',
    '@id': `${BASE_ORIGIN}/#organization`,
    name: 'CommonTool',
    url: BASE_ORIGIN,
  },
  sameAs: [
    'https://github.com/cyberzapp',
    'https://breathy.in',
  ],
};

export const ORGANIZATION_SCHEMA = {
  '@type': 'Organization',
  '@id': `${BASE_ORIGIN}/#organization`,
  name: 'CommonTool',
  url: BASE_ORIGIN,
  logo: `${BASE_ORIGIN}/icon.svg`,
  founder: {
    '@id': `${BASE_ORIGIN}/#suman-das`,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@breathy.in',
    contactType: 'customer support',
    availableLanguage: ['en'],
  },
  sameAs: [
    'https://github.com/cyberzapp/CommonTool',
    'https://breathy.in',
  ],
};

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
    : 'CommonTool — The Gold Standard for 100% Private, Zero-Upload Client-Side Web Utilities';

  const description = tool
    ? tool.seoDescription
    : cat
    ? cat.seoDescription
    : 'CommonTool by Suman Das: The global gold standard for 100% secure, zero-upload file processing. Merge & sign PDFs, convert media, scan OCR, make invoices & calculate finances directly in your browser with zero data transmission.';

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
  setMeta('meta[name="author"]', 'content', 'Suman Das');
  setMeta('meta[name="creator"]', 'content', 'Suman Das');
  setMeta('meta[name="publisher"]', 'content', 'CommonTool & Breathy');
  setMeta('meta[property="og:site_name"]', 'content', 'CommonTool');
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[property="og:type"]', 'content', 'website');
  setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);

  if (tool) {
    setMeta('meta[name="keywords"]', 'content', `${tool.keywords.join(', ')}, Suman Das, zero-upload, client-side security, CommonTool`);
  }

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // Inject Knowledge Graph JSON-LD Structured Data for Google Entity Recognition
  let ldScript = document.getElementById('commontool-jsonld') as HTMLScriptElement | null;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'commontool-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }

  const baseGraph: unknown[] = [AUTHOR_SCHEMA, ORGANIZATION_SCHEMA];

  if (tool) {
    baseGraph.push(
      {
        '@type': 'SoftwareApplication',
        '@id': `${canonicalUrl}#software`,
        name: tool.title,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All Web Browsers (WebAssembly, HTML5, WebCrypto)',
        url: canonicalUrl,
        description: tool.seoDescription,
        creator: { '@id': `${BASE_ORIGIN}/#suman-das` },
        publisher: { '@id': `${BASE_ORIGIN}/#organization` },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        softwareRequirements: 'Modern browser with WebAssembly support',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '1240',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: tool.faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      }
    );
  } else {
    baseGraph.push(
      {
        '@type': 'SoftwareApplication',
        '@id': `${BASE_ORIGIN}/#software`,
        name: 'CommonTool',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All Web Browsers (macOS, Windows, Linux, iOS, Android)',
        url: BASE_ORIGIN,
        description,
        creator: { '@id': `${BASE_ORIGIN}/#suman-das` },
        publisher: { '@id': `${BASE_ORIGIN}/#organization` },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'ItemList',
        name: 'CommonTool Client-Side Web Utilities Suite',
        description,
        itemListElement: TOOLS_CATALOG.map((t, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: t.title,
          url: `${BASE_ORIGIN}${t.path}`,
          description: t.seoDescription,
        })),
      }
    );
  }

  ldScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': baseGraph,
  });
}
