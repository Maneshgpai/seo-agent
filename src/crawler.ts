/**
 * Web Crawler Module
 * Fetches webpage content and extracts all relevant SEO data using Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import type {
  CrawlResult,
  PageMetadata,
  HeadingStructure,
  ImageData,
  LinkData,
  OpenGraphData,
  TwitterCardData,
  StructuredData,
} from './types.js';

// Default configuration
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_USER_AGENT = 'SEO-Agent/1.0 (https://github.com/openclaw/openclaw)';

/**
 * Crawls a webpage and extracts all SEO-relevant data
 */
export async function crawlPage(
  url: string,
  options: { timeout?: number; userAgent?: string } = {}
): Promise<CrawlResult> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;

  let browser: Browser | null = null;

  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page: Page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1920, height: 1080 });

    // Track load time
    const startTime = Date.now();

    // Navigate to the page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    const loadTime = Date.now() - startTime;
    const statusCode = response?.status() || 0;

    // Get the full HTML content
    const html = await page.content();
    const contentLength = Buffer.byteLength(html, 'utf8');

    // Parse HTML with Cheerio for easier extraction
    const $ = cheerio.load(html);

    // Extract all SEO data
    const metadata = extractMetadata($, url);
    const headings = extractHeadings($);
    const images = extractImages($, url);
    const links = extractLinks($, url);
    const openGraph = extractOpenGraph($);
    const twitterCard = extractTwitterCard($);
    const structuredData = extractStructuredData($);
    const viewport = $('meta[name="viewport"]').attr('content') || null;
    const favicon = extractFavicon($, url);
    const hreflang = extractHreflang($);
    const hasAmp = checkForAmp($);
    const renderBlockingResources = extractRenderBlockingResources($);

    await browser.close();

    return {
      url,
      statusCode,
      html,
      loadTime,
      isHttps: url.startsWith('https://'),
      contentLength,
      metadata,
      headings,
      images,
      links,
      openGraph,
      twitterCard,
      structuredData,
      viewport,
      favicon,
      hreflang,
      hasAmp,
      renderBlockingResources,
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw new Error(`Failed to crawl ${url}: ${(error as Error).message}`);
  }
}

/**
 * Extracts basic metadata from the page
 */
function extractMetadata($: cheerio.CheerioAPI, url: string): PageMetadata {
  return {
    url,
    title: $('title').text().trim() || null,
    metaDescription: $('meta[name="description"]').attr('content') || null,
    canonical: $('link[rel="canonical"]').attr('href') || null,
    robots: $('meta[name="robots"]').attr('content') || null,
    language: $('html').attr('lang') || null,
    charset: $('meta[charset]').attr('charset') || 
             $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([^;]+)/)?.[1] || null,
  };
}

/**
 * Extracts heading structure from the page
 */
function extractHeadings($: cheerio.CheerioAPI): HeadingStructure {
  return {
    h1: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2: $('h2').map((_, el) => $(el).text().trim()).get(),
    h3: $('h3').map((_, el) => $(el).text().trim()).get(),
    h4: $('h4').map((_, el) => $(el).text().trim()).get(),
    h5: $('h5').map((_, el) => $(el).text().trim()).get(),
    h6: $('h6').map((_, el) => $(el).text().trim()).get(),
  };
}

/**
 * Extracts all images with their attributes
 */
function extractImages($: cheerio.CheerioAPI, baseUrl: string): ImageData[] {
  const images: ImageData[] = [];
  
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      images.push({
        src: resolveUrl(src, baseUrl),
        alt: $(el).attr('alt') || null,
        width: $(el).attr('width') || null,
        height: $(el).attr('height') || null,
        loading: $(el).attr('loading') || null,
      });
    }
  });

  return images;
}

/**
 * Extracts all links with their attributes
 */
function extractLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
  const links: LinkData[] = [];
  const baseUrlObj = new URL(baseUrl);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      const resolvedHref = resolveUrl(href, baseUrl);
      let isInternal = false;
      
      try {
        const linkUrl = new URL(resolvedHref);
        isInternal = linkUrl.hostname === baseUrlObj.hostname;
      } catch {
        isInternal = true; // Relative URLs are internal
      }

      links.push({
        href: resolvedHref,
        text: $(el).text().trim(),
        isInternal,
        isNoFollow: ($(el).attr('rel') || '').includes('nofollow'),
        target: $(el).attr('target') || null,
      });
    }
  });

  return links;
}

/**
 * Extracts Open Graph metadata
 */
function extractOpenGraph($: cheerio.CheerioAPI): OpenGraphData {
  return {
    title: $('meta[property="og:title"]').attr('content') || null,
    description: $('meta[property="og:description"]').attr('content') || null,
    image: $('meta[property="og:image"]').attr('content') || null,
    url: $('meta[property="og:url"]').attr('content') || null,
    type: $('meta[property="og:type"]').attr('content') || null,
    siteName: $('meta[property="og:site_name"]').attr('content') || null,
  };
}

/**
 * Extracts Twitter Card metadata
 */
function extractTwitterCard($: cheerio.CheerioAPI): TwitterCardData {
  return {
    card: $('meta[name="twitter:card"]').attr('content') || null,
    title: $('meta[name="twitter:title"]').attr('content') || null,
    description: $('meta[name="twitter:description"]').attr('content') || null,
    image: $('meta[name="twitter:image"]').attr('content') || null,
    site: $('meta[name="twitter:site"]').attr('content') || null,
  };
}

/**
 * Extracts JSON-LD structured data
 */
function extractStructuredData($: cheerio.CheerioAPI): StructuredData[] {
  const structuredData: StructuredData[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonText = $(el).html();
      if (jsonText) {
        const data = JSON.parse(jsonText);
        const type = data['@type'] || 'Unknown';
        structuredData.push({ type, raw: data });
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return structuredData;
}

/**
 * Extracts favicon URL
 */
function extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const favicon = $('link[rel="icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href');
  
  return favicon ? resolveUrl(favicon, baseUrl) : null;
}

/**
 * Extracts hreflang tags for internationalization
 */
function extractHreflang($: cheerio.CheerioAPI): { lang: string; href: string }[] {
  const hreflang: { lang: string; href: string }[] = [];

  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr('hreflang');
    const href = $(el).attr('href');
    if (lang && href) {
      hreflang.push({ lang, href });
    }
  });

  return hreflang;
}

/**
 * Checks if the page has an AMP version
 */
function checkForAmp($: cheerio.CheerioAPI): boolean {
  return $('link[rel="amphtml"]').length > 0 || $('html[amp]').length > 0;
}

/**
 * Extracts render-blocking resources (CSS/JS in head)
 */
function extractRenderBlockingResources($: cheerio.CheerioAPI): string[] {
  const blocking: string[] = [];

  // CSS without media="print" or with blocking media
  $('head link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    const media = $(el).attr('media');
    if (href && (!media || media === 'all' || media === 'screen')) {
      blocking.push(href);
    }
  });

  // Synchronous scripts without defer/async
  $('head script[src]').each((_, el) => {
    const src = $(el).attr('src');
    const hasAsync = $(el).attr('async') !== undefined;
    const hasDefer = $(el).attr('defer') !== undefined;
    if (src && !hasAsync && !hasDefer) {
      blocking.push(src);
    }
  });

  return blocking;
}

/**
 * Resolves a potentially relative URL against a base URL
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * Fetches robots.txt content
 */
export async function fetchRobotsTxt(url: string): Promise<string | null> {
  try {
    const robotsUrl = new URL('/robots.txt', url).href;
    const response = await fetch(robotsUrl);
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches sitemap.xml content
 */
export async function fetchSitemap(url: string): Promise<string | null> {
  try {
    const sitemapUrl = new URL('/sitemap.xml', url).href;
    const response = await fetch(sitemapUrl);
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch {
    return null;
  }
}
