/**
 * SEO Agent Server
 * Express server that serves the frontend and provides API endpoints for SEO analysis
 * Designed for deployment on Google Cloud Run
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { crawlPage, fetchRobotsTxt, fetchSitemap } from './crawler.js';
import { crawlSite } from './site-crawler.js';
import { analyzeSite } from './site-analyzer.js';
import type { SiteAnalysisResult } from './site-analyzer.js';
import { formatSiteReportAsText } from './site-reporter.js';
import { analyzeBasicSEO } from './analyzers/basic.js';
import { analyzeIntermediateSEO } from './analyzers/intermediate.js';
import { analyzeAdvancedSEO } from './analyzers/advanced.js';
import { analyzePageSpeed } from './analyzers/pagespeed.js';
import { generateReport, formatReportAsText } from './reporter.js';
import { fetchPageSpeedData } from './pagespeed.js';
import type { AnalysisDepth, SEOIssue, SEOReport, PageSpeedData } from './types.js';
import { verifyJWT } from './jwt-middleware.js';
import { buildPdfReport, buildPdfReportFromSite } from './pdf-report.js';

// Load environment variables
config();

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Configuration
const PORT = parseInt(process.env.PORT || '8080');
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';
const ENABLE_RECAPTCHA = process.env.ENABLE_RECAPTCHA === 'true';

/** Frontend config injected into HTML at runtime (no keys in source code) */
function getFrontendEnv(): { RECAPTCHA_SITE_KEY: string; ENABLE_RECAPTCHA: boolean } {
  return {
    RECAPTCHA_SITE_KEY,
    ENABLE_RECAPTCHA: ENABLE_RECAPTCHA && !!RECAPTCHA_SITE_KEY,
  };
}

/** reCAPTCHA script tag; only injected when site key is set */
function getRecaptchaScriptTag(): string {
  if (!RECAPTCHA_SITE_KEY) return '<!-- reCAPTCHA not configured -->';
  return `<script src="https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}"></script>`;
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint for Cloud Run
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * API endpoint to analyze a single page or full site (mode: single | site)
 * Body: url, recaptchaToken?, mode?, maxPages?
 */
app.post('/api/analyze', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { url, recaptchaToken, mode: modeParam = 'single', maxPages: maxPagesRaw } = req.body;
    const depth = 'all' as AnalysisDepth;
    const maxPages = Math.min(Math.max(parseInt(String(maxPagesRaw), 10) || 50, 1), 500);
    const mode = typeof modeParam === 'string' ? modeParam : String(modeParam ?? 'single');
    const isSiteMode = mode.toLowerCase().trim() === 'site';

    // Validate required fields
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    // Verify reCAPTCHA if enabled
    if (ENABLE_RECAPTCHA) {
      const isValid = await verifyRecaptcha(recaptchaToken);
      if (!isValid) {
        res.status(403).json({ error: 'reCAPTCHA verification failed' });
        return;
      }
    }

    console.log(`Starting analysis for: ${url} (mode: ${mode}, isSiteMode: ${isSiteMode}, depth: ${depth}${isSiteMode ? `, maxPages: ${maxPages}` : ''})`);

    if (isSiteMode) {
      const siteReport = await performSiteAnalysis(url, depth, maxPages);
      console.log(`Site analysis complete for ${url}: ${siteReport.pageAnalyses.length} pages, average score ${siteReport.scores.averagePageScore}/100`);
      res.json({
        success: true,
        report: null,
        siteReport,
        textReport: formatSiteReportAsText(siteReport),
      });
    } else {
      const report = await performAnalysis(url, depth);
      console.log(`Analysis complete for ${url}: Score ${report.scores.overall}/100`);
      res.json({
        success: true,
        report,
        siteReport: null,
        textReport: formatReportAsText(report),
      });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: (error as Error).message,
    });
  }
});

/**
 * API endpoint for streaming analysis progress (Server-Sent Events)
 * Query: url, depth?, mode?, maxPages?
 */
app.get('/api/analyze/stream', verifyJWT, async (req: Request, res: Response) => {
  const { url, mode: modeParam = 'single', maxPages: maxPagesRaw } = req.query;
  const depth = 'all' as AnalysisDepth;
  const maxPages = Math.min(Math.max(parseInt(String(maxPagesRaw), 10) || 50, 1), 500);
  const mode = typeof modeParam === 'string' ? modeParam : Array.isArray(modeParam) ? modeParam[0] : 'single';
  const isSiteMode = String(mode).toLowerCase().trim() === 'site';

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  console.log(`[stream] mode=${mode} isSiteMode=${isSiteMode} maxPages=${maxPages}`);

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('step', { id: 'validate', status: 'running', title: 'Validating URL' });
    try {
      new URL(url);
    } catch {
      sendEvent('step', { id: 'validate', status: 'error', title: 'Invalid URL' });
      sendEvent('error', { message: 'Invalid URL format' });
      res.end();
      return;
    }
    sendEvent('step', { id: 'validate', status: 'done', title: 'URL validated' });

    if (isSiteMode) {
      // Site-wide: crawl then analyze
      sendEvent('step', { id: 'crawl', status: 'running', title: 'Crawling website' });
      const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
      const userAgent = process.env.USER_AGENT;
      const crawlResult = await crawlSite(url, {
        maxPages,
        concurrency: 3,
        timeout,
        userAgent,
        respectRobotsTxt: true,
        onPageCrawled: (pageUrl, index, total) => {
          sendEvent('step', { id: 'crawl', status: 'running', title: 'Crawling website', detail: `Page ${index}/${total}` });
        },
      });
      sendEvent('step', { id: 'crawl', status: 'done', title: 'Crawl complete', detail: `${crawlResult.pages.length} pages` });

      if (crawlResult.pages.length === 0) {
        sendEvent('error', { message: 'No pages could be crawled. Check the URL and try again.' });
        res.end();
        return;
      }

      sendEvent('step', { id: 'basic', status: 'running', title: 'Running basic SEO checks' });
      sendEvent('step', { id: 'basic', status: 'done', title: 'Basic checks complete' });
      sendEvent('step', { id: 'intermediate', status: 'running', title: 'Running intermediate checks' });
      sendEvent('step', { id: 'intermediate', status: 'done', title: 'Intermediate checks complete' });
      sendEvent('step', { id: 'advanced', status: 'running', title: 'Running advanced checks' });
      sendEvent('step', { id: 'advanced', status: 'done', title: 'Advanced checks complete' });
      sendEvent('step', { id: 'pagespeed', status: 'skipped', title: 'PageSpeed: skipped in site mode' });

      sendEvent('step', { id: 'report', status: 'running', title: 'Generating report' });
      const siteReport = analyzeSite(crawlResult, depth);
      sendEvent('step', { id: 'report', status: 'done', title: 'Report ready' });

      sendEvent('complete', {
        report: null,
        siteReport,
        textReport: formatSiteReportAsText(siteReport),
      });
    } else {
      // Single page
      sendEvent('step', { id: 'crawl', status: 'running', title: 'Loading page' });
      const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
      const userAgent = process.env.USER_AGENT;
      const crawlResult = await crawlPage(url, { timeout, userAgent });
      sendEvent('step', { id: 'crawl', status: 'done', title: 'Page loaded', detail: `${(crawlResult.loadTime / 1000).toFixed(2)}s` });

      const issues: SEOIssue[] = [];
      const analysisDepth = depth;

      if (analysisDepth === 'basic' || analysisDepth === 'all') {
        sendEvent('step', { id: 'basic', status: 'running', title: 'Running basic SEO checks' });
        issues.push(...analyzeBasicSEO(crawlResult));
        sendEvent('step', { id: 'basic', status: 'done', title: 'Basic checks complete' });
      }
      if (analysisDepth === 'intermediate' || analysisDepth === 'all') {
        sendEvent('step', { id: 'intermediate', status: 'running', title: 'Running intermediate checks' });
        issues.push(...analyzeIntermediateSEO(crawlResult));
        sendEvent('step', { id: 'intermediate', status: 'done', title: 'Intermediate checks complete' });
      }
      let pageSpeedData: PageSpeedData | null = null;
      if (analysisDepth === 'advanced' || analysisDepth === 'all') {
        sendEvent('step', { id: 'advanced', status: 'running', title: 'Running advanced checks' });
        const robotsTxt = await fetchRobotsTxt(url);
        const sitemap = await fetchSitemap(url);
        issues.push(...analyzeAdvancedSEO(crawlResult, robotsTxt, sitemap));
        sendEvent('step', { id: 'advanced', status: 'done', title: 'Advanced checks complete' });

        const pageSpeedApiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
        if (pageSpeedApiKey) {
          sendEvent('step', { id: 'pagespeed', status: 'running', title: 'Fetching PageSpeed Insights' });
          pageSpeedData = await fetchPageSpeedData(url, pageSpeedApiKey);
          if (pageSpeedData) {
            issues.push(...analyzePageSpeed(pageSpeedData));
            sendEvent('step', { id: 'pagespeed', status: 'done', title: 'PageSpeed analysis complete' });
          } else {
            sendEvent('step', { id: 'pagespeed', status: 'warning', title: 'PageSpeed analysis skipped' });
          }
        } else {
          sendEvent('step', { id: 'pagespeed', status: 'skipped', title: 'PageSpeed: No API key configured' });
        }
      }

      sendEvent('step', { id: 'report', status: 'running', title: 'Generating report' });
      const report = generateReport(url, analysisDepth, issues, crawlResult.metadata, pageSpeedData);
      sendEvent('step', { id: 'report', status: 'done', title: 'Report ready' });

      sendEvent('complete', {
        report,
        siteReport: null,
        textReport: formatReportAsText(report),
      });
    }
  } catch (error) {
    console.error('Stream analysis error:', error);
    sendEvent('error', { message: (error as Error).message });
  }

  res.end();
});

/**
 * Perform the SEO analysis
 */
async function performAnalysis(url: string, depth: AnalysisDepth): Promise<SEOReport> {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  const userAgent = process.env.USER_AGENT;

  // Crawl the page
  const crawlResult = await crawlPage(url, { timeout, userAgent });

  // Collect issues based on depth
  const issues: SEOIssue[] = [];

  // Basic analysis
  if (depth === 'basic' || depth === 'all') {
    issues.push(...analyzeBasicSEO(crawlResult));
  }

  // Intermediate analysis
  if (depth === 'intermediate' || depth === 'all') {
    issues.push(...analyzeIntermediateSEO(crawlResult));
  }

  // Advanced analysis
  let pageSpeedData: PageSpeedData | null = null;
  if (depth === 'advanced' || depth === 'all') {
    const robotsTxt = await fetchRobotsTxt(url);
    const sitemap = await fetchSitemap(url);
    issues.push(...analyzeAdvancedSEO(crawlResult, robotsTxt, sitemap));

    // PageSpeed analysis if API key is available
    const pageSpeedApiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    if (pageSpeedApiKey) {
      pageSpeedData = await fetchPageSpeedData(url, pageSpeedApiKey);
      if (pageSpeedData) {
        issues.push(...analyzePageSpeed(pageSpeedData));
      }
    }
  }

  // Generate report
  return generateReport(url, depth, issues, crawlResult.metadata, pageSpeedData);
}

/**
 * Perform site-wide SEO analysis: crawl multiple pages then analyze each.
 */
async function performSiteAnalysis(url: string, depth: AnalysisDepth, maxPages: number): Promise<SiteAnalysisResult> {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  const userAgent = process.env.USER_AGENT;

  const crawlResult = await crawlSite(url, {
    maxPages,
    concurrency: 3,
    timeout,
    userAgent,
    respectRobotsTxt: true,
  });

  if (crawlResult.pages.length === 0) {
    throw new Error('No pages could be crawled. Check the URL and try again.');
  }

  return analyzeSite(crawlResult, depth);
}

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!RECAPTCHA_SECRET_KEY || !token) {
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json() as { success: boolean; score?: number };
    
    // For v3, check score (0.0 - 1.0, higher is more likely human)
    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

/**
 * POST /api/report/pdf — generate and download PDF report from JSON body
 * Body: { report?: SEOReport, siteReport?: SiteAnalysisResult }. Single-page or site report.
 */
app.post('/api/report/pdf', async (req: Request, res: Response) => {
  try {
    const { report, siteReport } = req.body as { report?: SEOReport; siteReport?: SiteAnalysisResult };
    const hasSiteReport = siteReport != null && siteReport.baseUrl != null && Array.isArray(siteReport.pageAnalyses);
    if (hasSiteReport) {
      console.log(`[PDF] Building site report for ${siteReport.baseUrl} (${siteReport.pageAnalyses.length} pages)`);
      const pdfBuffer = await buildPdfReportFromSite(siteReport);
      const filename = `seo-site-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
      return;
    }
    if (!report?.url) {
      res.status(400).json({ error: 'Request body must include report (with url) or siteReport (with baseUrl and pageAnalyses)' });
      return;
    }
    console.log(`[PDF] Building single-page report for ${report.url}`);
    const pdfBuffer = await buildPdfReport(report);
    const filename = `seo-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed', message: (error as Error).message });
  }
});

/**
 * Cache for index.html template (placeholders replaced at request time)
 */
let indexHtmlTemplate: string | null = null;

function getIndexHtmlTemplate(): string {
  if (indexHtmlTemplate === null) {
    const indexPath = path.join(frontendPath, 'index.html');
    indexHtmlTemplate = fs.readFileSync(indexPath, 'utf-8');
  }
  return indexHtmlTemplate;
}

/**
 * Catch-all route: serve index.html with env-driven config injected.
 * No keys or IDs are stored in frontend source; all come from server env.
 */
app.get('*path', (_req: Request, res: Response) => {
  let html = getIndexHtmlTemplate();
  html = html.replace('<!-- INJECT_RECAPTCHA_SCRIPT -->', getRecaptchaScriptTag());
  html = html.replace('__INJECT_ENV__', JSON.stringify(getFrontendEnv()));
  res.type('html').send(html);
});

/**
 * Error handling middleware
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    SEO Agent Server                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Frontend: http://localhost:${PORT}                              ║
║  API:      http://localhost:${PORT}/api/analyze                  ║
║  Health:   http://localhost:${PORT}/health                       ║
╠═══════════════════════════════════════════════════════════════╣
║  reCAPTCHA: ${ENABLE_RECAPTCHA ? 'Enabled' : 'Disabled'}                                        ║
║  PageSpeed: ${process.env.GOOGLE_PAGESPEED_API_KEY ? 'Configured' : 'Not configured'}                                     ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
