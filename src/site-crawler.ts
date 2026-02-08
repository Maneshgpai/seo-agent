/**
 * Site-Wide Crawler Module
 * Discovers and crawls all pages of a website
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { crawlPage, fetchRobotsTxt, fetchSitemap } from './crawler.js';
import type { CrawlResult } from './types.js';

// Configuration for site-wide crawling
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 500;

export interface SiteCrawlOptions {
  maxPages?: number;          // Maximum pages to crawl
  concurrency?: number;       // Parallel crawl requests
  delayMs?: number;           // Delay between requests
  timeout?: number;           // Per-page timeout
  userAgent?: string;         // Custom user agent
  includeSubdomains?: boolean; // Include subdomains
  respectRobotsTxt?: boolean; // Respect robots.txt rules
  onPageCrawled?: (url: string, index: number, total: number) => void; // Progress callback
}

export interface SiteCrawlResult {
  baseUrl: string;
  totalPages: number;
  crawledPages: number;
  failedPages: string[];
  pages: CrawlResult[];
  sitemapUrls: string[];
  robotsTxt: string | null;
  crawlDuration: number;
}

/**
 * Crawls an entire website by discovering and following internal links
 */
export async function crawlSite(
  startUrl: string,
  options: SiteCrawlOptions = {}
): Promise<SiteCrawlResult> {
  const maxPages = options.maxPages || DEFAULT_MAX_PAGES;
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
  const delayMs = options.delayMs || DEFAULT_DELAY_MS;
  const timeout = options.timeout || 30000;
  const userAgent = options.userAgent;
  const respectRobotsTxt = options.respectRobotsTxt ?? true;

  const startTime = Date.now();

  // Normalize the start URL
  const baseUrlObj = new URL(startUrl);
  const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.hostname}`;
  const baseDomain = baseUrlObj.hostname;

  console.log(`\n🌐 Starting site-wide crawl of ${baseUrl}`);
  console.log(`   Max pages: ${maxPages}, Concurrency: ${concurrency}`);

  // Fetch robots.txt first
  console.log('⏳ Fetching robots.txt...');
  const robotsTxt = await fetchRobotsTxt(baseUrl);
  const disallowedPaths = respectRobotsTxt ? parseRobotsTxtDisallow(robotsTxt) : [];
  
  if (disallowedPaths.length > 0) {
    console.log(`   Found ${disallowedPaths.length} disallowed paths in robots.txt`);
  }

  // Discover page URLs from sitemap (handles both single sitemap and sitemap index)
  console.log('⏳ Fetching sitemap...');
  const sitemapUrls = await fetchSitemapUrls(baseUrl, baseDomain, maxPages);
  if (sitemapUrls.length > 0) {
    console.log(`   Found ${sitemapUrls.length} URLs from sitemap(s)`);
  }

  // Initialize URL queue with start URL and sitemap URLs
  const urlQueue: string[] = [startUrl];
  const discoveredUrls = new Set<string>([normalizeUrl(startUrl)]);
  const crawledPages: CrawlResult[] = [];
  const failedPages: string[] = [];

  // Add sitemap URLs to queue (limited)
  for (const sitemapUrl of sitemapUrls.slice(0, maxPages)) {
    const normalized = normalizeUrl(sitemapUrl);
    if (!discoveredUrls.has(normalized)) {
      discoveredUrls.add(normalized);
      urlQueue.push(sitemapUrl);
    }
  }

  console.log(`⏳ Starting crawl with ${urlQueue.length} initial URLs...\n`);

  // Process URLs in batches
  while (urlQueue.length > 0 && crawledPages.length < maxPages) {
    // Get batch of URLs to process
    const batch = urlQueue.splice(0, Math.min(concurrency, maxPages - crawledPages.length));

    // Crawl batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        // Check if URL is disallowed
        if (isUrlDisallowed(url, disallowedPaths)) {
          console.log(`   ⊘ Skipped (robots.txt): ${truncateUrl(url)}`);
          return null;
        }

        try {
          const result = await crawlPage(url, { timeout, userAgent });
          
          // Progress callback
          if (options.onPageCrawled) {
            options.onPageCrawled(url, crawledPages.length + 1, maxPages);
          }
          
          console.log(`   ✓ [${crawledPages.length + 1}/${maxPages}] ${truncateUrl(url)} (${result.loadTime}ms)`);
          return result;
        } catch (error) {
          console.log(`   ✗ Failed: ${truncateUrl(url)} - ${(error as Error).message}`);
          failedPages.push(url);
          return null;
        }
      })
    );

    // Process results and discover new URLs
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const crawlResult = result.value;
        crawledPages.push(crawlResult);

        // Extract and queue new internal URLs
        const newUrls = extractInternalUrls(crawlResult, baseDomain, disallowedPaths);
        for (const newUrl of newUrls) {
          const normalized = normalizeUrl(newUrl);
          if (!discoveredUrls.has(normalized) && discoveredUrls.size < maxPages * 2) {
            discoveredUrls.add(normalized);
            urlQueue.push(newUrl);
          }
        }
      }
    }

    // Delay between batches to be respectful
    if (urlQueue.length > 0 && crawledPages.length < maxPages) {
      await sleep(delayMs);
    }
  }

  const crawlDuration = Date.now() - startTime;

  console.log(`\n✓ Crawl complete: ${crawledPages.length} pages in ${(crawlDuration / 1000).toFixed(1)}s`);
  if (failedPages.length > 0) {
    console.log(`  ${failedPages.length} pages failed to load`);
  }

  return {
    baseUrl,
    totalPages: discoveredUrls.size,
    crawledPages: crawledPages.length,
    failedPages,
    pages: crawledPages,
    sitemapUrls,
    robotsTxt,
    crawlDuration,
  };
}

/**
 * Returns true if hostname is the same site as baseDomain (www vs non-www normalized)
 */
function isSameDomain(hostname: string, baseDomain: string): boolean {
  const stripWww = (h: string) => (h.startsWith('www.') ? h.slice(4) : h);
  const a = stripWww(hostname.toLowerCase());
  const b = stripWww(baseDomain.toLowerCase());
  return a === b || hostname.toLowerCase().endsWith('.' + b);
}

/**
 * Extracts internal URLs from a crawl result (same site, including www/non-www)
 */
function extractInternalUrls(
  crawlResult: CrawlResult,
  baseDomain: string,
  disallowedPaths: string[]
): string[] {
  const urls: string[] = [];

  for (const link of crawlResult.links) {
    if (link.isInternal && link.href) {
      try {
        const urlObj = new URL(link.href);
        if (!isSameDomain(urlObj.hostname, baseDomain)) continue;

        const path = urlObj.pathname.toLowerCase();
        if (
          !path.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|pdf|zip|xml|json|woff|woff2|ttf|eot)$/) &&
          !isUrlDisallowed(link.href, disallowedPaths)
        ) {
          urls.push(link.href);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return urls;
}

/**
 * Parses robots.txt and extracts disallowed paths
 */
function parseRobotsTxtDisallow(robotsTxt: string | null): string[] {
  if (!robotsTxt) return [];

  const disallowed: string[] = [];
  const lines = robotsTxt.split('\n');
  let isRelevantUserAgent = false;

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    if (trimmed.startsWith('user-agent:')) {
      const agent = trimmed.replace('user-agent:', '').trim();
      isRelevantUserAgent = agent === '*' || agent.includes('bot');
    } else if (isRelevantUserAgent && trimmed.startsWith('disallow:')) {
      const path = line.trim().replace(/^disallow:\s*/i, '').trim();
      if (path && path !== '') {
        disallowed.push(path);
      }
    }
  }

  return disallowed;
}

/**
 * Checks if a URL is disallowed by robots.txt
 */
function isUrlDisallowed(url: string, disallowedPaths: string[]): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    for (const disallowed of disallowedPaths) {
      if (disallowed === '/') {
        return true; // Disallow all
      }
      if (path.startsWith(disallowed)) {
        return true;
      }
      // Handle wildcard patterns
      if (disallowed.includes('*')) {
        const regex = new RegExp('^' + disallowed.replace(/\*/g, '.*'));
        if (regex.test(path)) {
          return true;
        }
      }
    }
  } catch {
    // Invalid URL
  }

  return false;
}

/** Max child sitemaps to fetch when main sitemap is an index */
const MAX_CHILD_SITEMAPS = 15;

/**
 * Fetches sitemap and returns page URLs. If main sitemap is an index, fetches child sitemaps.
 */
async function fetchSitemapUrls(
  baseUrl: string,
  baseDomain: string,
  maxUrls: number
): Promise<string[]> {
  const sitemapContent = await fetchSitemap(baseUrl);
  if (!sitemapContent) return [];

  if (sitemapContent.includes('<sitemapindex')) {
    const childSitemapLocs = extractSitemapIndexLocations(sitemapContent);
    if (childSitemapLocs.length === 0) return [];

    const allUrls: string[] = [];
    const toFetch = childSitemapLocs.slice(0, MAX_CHILD_SITEMAPS);
    for (const loc of toFetch) {
      if (allUrls.length >= maxUrls) break;
      try {
        const res = await fetch(loc);
        if (!res.ok) continue;
        const text = await res.text();
        const pageUrls = parsePageUrlsFromSitemap(text, baseDomain);
        for (const u of pageUrls) {
          if (allUrls.length >= maxUrls) break;
          allUrls.push(u);
        }
      } catch {
        // Skip failed child sitemap
      }
    }
    return allUrls;
  }

  return parsePageUrlsFromSitemap(sitemapContent, baseDomain).slice(0, maxUrls);
}

/**
 * From sitemap index XML, returns list of child sitemap <loc> URLs
 */
function extractSitemapIndexLocations(sitemapIndexContent: string): string[] {
  const locs: string[] = [];
  const matches = sitemapIndexContent.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi);
  for (const match of matches) {
    if (match[1]) locs.push(match[1].trim());
  }
  return locs;
}

/**
 * Parses a single sitemap XML (urlset) and returns page URLs for the given domain
 */
function parsePageUrlsFromSitemap(sitemapContent: string, baseDomain: string): string[] {
  const urls: string[] = [];
  const matches = sitemapContent.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi);
  for (const match of matches) {
    try {
      const url = match[1].trim();
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const base = baseDomain.toLowerCase();
      const sameDomain =
        domain === base ||
        domain.endsWith('.' + base) ||
        (domain.startsWith('www.') ? domain.slice(4) === base.replace(/^www\./, '') : false);
      if (sameDomain) urls.push(url);
    } catch {
      // Skip invalid URL
    }
  }
  return urls;
}

/**
 * Normalizes a URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash, fragment, and common tracking params
    let normalized = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, '');
    
    // Keep important query params, remove tracking ones
    const importantParams = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams) {
      if (!['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid', 'gclid'].includes(key)) {
        importantParams.set(key, value);
      }
    }
    
    const queryString = importantParams.toString();
    if (queryString) {
      normalized += '?' + queryString;
    }
    
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Truncates URL for display
 */
function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    if (path.length > 30) {
      return `${urlObj.hostname}${path.substring(0, 27)}...`;
    }
    return url.substring(0, maxLength - 3) + '...';
  } catch {
    return url.substring(0, maxLength - 3) + '...';
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
