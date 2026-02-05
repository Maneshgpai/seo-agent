#!/usr/bin/env node

/**
 * SEO Agent - Main Entry Point
 * Analyzes websites and provides comprehensive SEO recommendations
 * Supports both single-page and site-wide analysis
 * 
 * Usage: 
 *   npx tsx src/index.ts <url> [options]
 *   npx tsx src/index.ts <url> --site [options]  # Full site analysis
 */

import { config } from 'dotenv';
import { crawlPage, fetchRobotsTxt, fetchSitemap } from './crawler.js';
import { crawlSite } from './site-crawler.js';
import { analyzeBasicSEO } from './analyzers/basic.js';
import { analyzeIntermediateSEO } from './analyzers/intermediate.js';
import { analyzeAdvancedSEO } from './analyzers/advanced.js';
import { analyzePageSpeed } from './analyzers/pagespeed.js';
import { analyzeSite } from './site-analyzer.js';
import { generateReport, formatReportAsText, formatReportAsJson, generateSummaryLine } from './reporter.js';
import { formatSiteReportAsText, formatSiteReportAsJson, generateSiteSummaryLine } from './site-reporter.js';
import { fetchPageSpeedData } from './pagespeed.js';
import type { AnalysisDepth, SEOIssue, SEOReport, PageSpeedData } from './types.js';
import type { SiteAnalysisResult } from './site-analyzer.js';

// Load environment variables
config();

/**
 * Single page analysis function
 */
export async function analyzeSEO(
  url: string,
  options: {
    depth?: AnalysisDepth;
    timeout?: number;
    userAgent?: string;
  } = {}
): Promise<SEOReport> {
  const depth = options.depth || 'all';
  const timeout = options.timeout || parseInt(process.env.REQUEST_TIMEOUT || '30000');
  const userAgent = options.userAgent || process.env.USER_AGENT;

  console.log(`\n🔍 Analyzing: ${url}`);
  console.log(`📊 Depth: ${depth}`);
  console.log('');

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Crawl the page
  console.log('⏳ Crawling page...');
  const crawlResult = await crawlPage(url, { timeout, userAgent });
  console.log(`✓ Page loaded in ${(crawlResult.loadTime / 1000).toFixed(2)}s`);

  // Collect all issues based on depth
  const issues: SEOIssue[] = [];

  // Basic analysis (always included)
  if (depth === 'basic' || depth === 'all') {
    console.log('⏳ Running basic SEO checks...');
    issues.push(...analyzeBasicSEO(crawlResult));
    console.log('✓ Basic checks complete');
  }

  // Intermediate analysis
  if (depth === 'intermediate' || depth === 'all') {
    console.log('⏳ Running intermediate SEO checks...');
    issues.push(...analyzeIntermediateSEO(crawlResult));
    console.log('✓ Intermediate checks complete');
  }

  // Advanced analysis
  if (depth === 'advanced' || depth === 'all') {
    console.log('⏳ Running advanced SEO checks...');
    
    // Fetch robots.txt and sitemap for advanced checks
    console.log('  ⏳ Fetching robots.txt...');
    const robotsTxt = await fetchRobotsTxt(url);
    console.log('  ⏳ Fetching sitemap.xml...');
    const sitemap = await fetchSitemap(url);
    
    issues.push(...analyzeAdvancedSEO(crawlResult, robotsTxt, sitemap));
    console.log('✓ Advanced checks complete');
  }

  // PageSpeed Insights analysis (requires API key)
  let pageSpeedData: PageSpeedData | null = null;
  const pageSpeedApiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  if (depth === 'advanced' || depth === 'all') {
    if (!pageSpeedApiKey) {
      console.log('⚠ PageSpeed checks skipped: GOOGLE_PAGESPEED_API_KEY not set');
    } else {
      console.log('⏳ Running PageSpeed Insights analysis...');
      console.log('  (This may take up to 60 seconds)');
      pageSpeedData = await fetchPageSpeedData(url, pageSpeedApiKey);
      
      if (pageSpeedData) {
        issues.push(...analyzePageSpeed(pageSpeedData));
        console.log('✓ PageSpeed analysis complete');
      } else {
        console.log('⚠ PageSpeed analysis failed - continuing without it');
      }
    }
  }

  // Generate report
  console.log('⏳ Generating report...');
  const report = generateReport(url, depth, issues, crawlResult.metadata, pageSpeedData);
  console.log('✓ Report generated\n');

  return report;
}

/**
 * Site-wide analysis function - crawls and analyzes all pages
 */
export async function analyzeSiteWide(
  url: string,
  options: {
    depth?: AnalysisDepth;
    maxPages?: number;
    concurrency?: number;
    timeout?: number;
    userAgent?: string;
  } = {}
): Promise<SiteAnalysisResult> {
  const depth = options.depth || 'all';
  const maxPages = options.maxPages || 50;
  const concurrency = options.concurrency || 3;
  const timeout = options.timeout || parseInt(process.env.REQUEST_TIMEOUT || '30000');
  const userAgent = options.userAgent || process.env.USER_AGENT;

  console.log(`\n🌐 SITE-WIDE SEO ANALYSIS`);
  console.log(`📍 Starting URL: ${url}`);
  console.log(`📊 Depth: ${depth}`);
  console.log(`📄 Max Pages: ${maxPages}`);
  console.log('');

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Crawl the entire site
  const crawlResult = await crawlSite(url, {
    maxPages,
    concurrency,
    timeout,
    userAgent,
    respectRobotsTxt: true,
  });

  if (crawlResult.pages.length === 0) {
    throw new Error('No pages could be crawled. Check the URL and try again.');
  }

  // Analyze the site
  console.log('\n⏳ Analyzing SEO across all pages...');
  const report = analyzeSite(crawlResult, depth);
  console.log('✓ Analysis complete\n');

  return report;
}

/**
 * CLI argument parser
 */
function parseArgs(args: string[]): {
  url: string | null;
  depth: AnalysisDepth;
  format: 'text' | 'json';
  siteWide: boolean;
  maxPages: number;
  concurrency: number;
  help: boolean;
} {
  let url: string | null = null;
  let depth: AnalysisDepth = 'all';
  let format: 'text' | 'json' = 'text';
  let siteWide = false;
  let maxPages = 50;
  let concurrency = 3;
  let help = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--site' || arg === '-s') {
      siteWide = true;
    } else if (arg.startsWith('--depth=')) {
      const value = arg.split('=')[1] as AnalysisDepth;
      if (['basic', 'intermediate', 'advanced', 'all'].includes(value)) {
        depth = value;
      }
    } else if (arg.startsWith('--format=')) {
      const value = arg.split('=')[1];
      if (value === 'json' || value === 'text') {
        format = value;
      }
    } else if (arg.startsWith('--max-pages=')) {
      const value = parseInt(arg.split('=')[1]);
      if (!isNaN(value) && value > 0) {
        maxPages = value;
      }
    } else if (arg.startsWith('--concurrency=')) {
      const value = parseInt(arg.split('=')[1]);
      if (!isNaN(value) && value > 0 && value <= 10) {
        concurrency = value;
      }
    } else if (!arg.startsWith('-') && !url) {
      url = arg;
    }
  }

  return { url, depth, format, siteWide, maxPages, concurrency, help };
}

/**
 * Prints usage instructions
 */
function printUsage(): void {
  console.log(`
SEO Agent - Website SEO Analyzer

USAGE:
  npx tsx src/index.ts <url> [options]

MODES:
  Single Page (default):  Analyzes only the specified URL
  Site-Wide (--site):     Crawls and analyzes all pages of the website

OPTIONS:
  --site, -s             Enable site-wide analysis (crawls entire website)
  
  --depth=<level>        Analysis depth (basic, intermediate, advanced, all)
                         Default: all

  --format=<type>        Output format (text, json)
                         Default: text

  --max-pages=<n>        Maximum pages to crawl in site-wide mode (1-500)
                         Default: 50

  --concurrency=<n>      Parallel requests in site-wide mode (1-10)
                         Default: 3

  --help, -h             Show this help message

EXAMPLES:
  # Single page analysis
  npx tsx src/index.ts https://example.com
  npx tsx src/index.ts https://example.com --depth=basic

  # Site-wide analysis
  npx tsx src/index.ts https://example.com --site
  npx tsx src/index.ts https://example.com --site --max-pages=100
  npx tsx src/index.ts https://example.com --site --format=json

ANALYSIS LEVELS:
  basic         - Title, meta description, headings, canonical, robots, language
  intermediate  - Images, links, Open Graph, Twitter Cards, favicon, HTTPS
  advanced      - Structured data, viewport, performance, sitemap, robots.txt
  all           - All checks from all levels (default)

SITE-WIDE FEATURES:
  • Discovers pages via internal links and sitemap.xml
  • Respects robots.txt disallow rules
  • Identifies site-wide vs page-specific issues
  • Aggregates scores across all pages
  • Highlights worst and best performing pages
`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { url, depth, format, siteWide, maxPages, concurrency, help } = parseArgs(args);

  if (help || !url) {
    printUsage();
    process.exit(help ? 0 : 1);
  }

  try {
    if (siteWide) {
      // Site-wide analysis
      const report = await analyzeSiteWide(url, { depth, maxPages, concurrency });

      // Output results
      if (format === 'json') {
        console.log(formatSiteReportAsJson(report));
      } else {
        console.log(formatSiteReportAsText(report));
      }

      // Print summary
      console.log('\n' + generateSiteSummaryLine(report) + '\n');

      // Exit with non-zero if critical issues found
      process.exit(report.summary.criticalIssues > 0 ? 1 : 0);
    } else {
      // Single page analysis
      const report = await analyzeSEO(url, { depth });

      // Output results
      if (format === 'json') {
        console.log(formatReportAsJson(report));
      } else {
        console.log(formatReportAsText(report));
      }

      // Print summary
      console.log('\n' + generateSummaryLine(report) + '\n');

      // Exit with non-zero if critical issues found
      process.exit(report.summary.failed > 0 ? 1 : 0);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${(error as Error).message}\n`);
    process.exit(1);
  }
}

// Run CLI if this is the main module
main();

// Export for programmatic use
export { generateReport, formatReportAsText, formatReportAsJson };
export { analyzeSite, formatSiteReportAsText, formatSiteReportAsJson };
export type { SEOReport, SEOIssue, AnalysisDepth, SiteAnalysisResult };
