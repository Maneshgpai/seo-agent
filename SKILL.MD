# SKILL.MD — AI Agent Reference (update on every code/doc change)

## Update rule (mandatory for AI agents)
Whenever you (the AI agent) add, change, or remove any logic, code, config, or documentation in this repo, you MUST update this file in the same edit session so it still accurately describes architecture, file roles, and data flow. Apply updates for: new or removed files, changed behavior or APIs, new env vars, updated dependencies or scripts. Keep entries minimal and token-efficient.

---

## Architecture

- **Stack**: Node 22+, TypeScript (ES2022, NodeNext), Express 5, Puppeteer, Cheerio. Frontend: vanilla TS, esbuild bundle, static HTML/CSS.
- **Entry points**: CLI `src/index.ts` (single/site analysis); server `src/server.ts` (API + static frontend). Build: `tsc` → `dist/`, frontend: `esbuild frontend/app.ts` → `frontend/app.js`.
- **Deploy**: Docker (Node 22 bookworm-slim + Chromium), Cloud Run via `cloudbuild.yaml` (2Gi, 300s timeout). Env from `.env`; see `.env.example`.

---

## File map

| Path | Role |
|------|------|
| `src/index.ts` | CLI: parseArgs, analyzeSEO (single), analyzeSiteWide (site), printUsage. Exports analyzeSEO, analyzeSiteWide, reporters, types. |
| `src/server.ts` | Express: static `frontend/`, /health, POST /api/analyze, GET /api/analyze/stream (SSE), POST /api/report/pdf. Single: performAnalysis → SEOReport. Site: mode=site + maxPages → performSiteAnalysis (crawlSite, then fetchPageSpeedForSite for first N pages when API key set, then analyzeSite with pageSpeedByUrl) → SiteAnalysisResult. PDF: body { report } or { siteReport } → buildPdfReport or buildPdfReportFromSite. Catch-all serves index.html. |
| `src/jwt-middleware.ts` | verifyJWT: Bearer token, jose jwtVerify; issuer aidyne-solutions-website, audience seo-agent-cloud-run. Skip if no JWT_SECRET. |
| `src/types.ts` | AnalysisDepth, Priority, Category, CheckStatus; SEOIssue, PageMetadata, HeadingStructure, ImageData, LinkData, OpenGraphData, TwitterCardData, StructuredData; CrawlResult; SEOReport, ScoreBreakdown, PageSpeedData, CoreWebVitals, LighthouseScores, LighthouseAudit. |
| `src/crawler.ts` | crawlPage(url, opts): Puppeteer → HTML, Cheerio extract metadata, headings, images, links, OG, Twitter, JSON-LD, viewport, favicon, hreflang, hasAmp, renderBlockingResources. fetchRobotsTxt, fetchSitemap (base URL + /robots.txt, /sitemap.xml). |
| `src/site-crawler.ts` | crawlSite(startUrl, opts): fetchRobotsTxt, fetchSitemap, parse disallow, sitemap <loc>, queue; batch crawl via crawlPage; extract internal links; respect robots, normalize URLs. SiteCrawlResult: baseUrl, pages[], failedPages, sitemapUrls, robotsTxt, crawlDuration. |
| `src/site-analyzer.ts` | analyzeSite(crawlResult, depth, pageSpeedByUrl?): per-page basic/intermediate/advanced; when pageSpeedByUrl provided (site mode), merges PageSpeed issues and attaches pageSpeed to PageAnalysis. Aggregate by check key → SiteWideIssue; scores, summary, recommendations, technicalDetails. PageAnalysis may include pageSpeed. |
| `src/reporter.ts` | generateReport(url, depth, issues, metadata, pageSpeedData?) → SEOReport. calculateScores (basic 40%, intermediate 35%, advanced 25%), summary, categorizeRecommendations. formatReportAsText, formatReportAsJson, getGrade, generateSummaryLine. |
| `src/pdf-report.ts` | buildPdfReport(report) → single-page PDF. buildPdfReportFromSite(siteReport) → site PDF: analyzed URLs list, site summary scores, then per-page sections (URL, score, critical/warning counts, detailed issues table). pdfmake; header/footer; Aidyne branding. Deps: pdfmake (Roboto). |
| `src/site-reporter.ts` | formatSiteReportAsText( SiteAnalysisResult ), formatSiteReportAsJson, generateSiteSummaryLine, generateExecutiveSummary. |
| `src/pagespeed.ts` | fetchPageSpeedData(url, apiKey, strategy): PageSpeed v5 API; parsePageSpeedResponse → coreWebVitals (LCP, CLS, FID, INP, TTFB), lighthouseScores, audits. getRatingStatus, getMetricName, getMetricThresholds. |
| `src/analyzers/index.ts` | Re-exports basic, intermediate, advanced, pagespeed. |
| `src/analyzers/basic.ts` | analyzeBasicSEO(crawlResult): title (30–60), meta desc (120–160), H1 (one), heading hierarchy, canonical, robots meta, language, charset. Returns SEOIssue[]. |
| `src/analyzers/intermediate.ts` | analyzeIntermediateSEO: image alt/dimensions/lazy, internal/external links, URL structure, Open Graph, Twitter Card, favicon, HTTPS. |
| `src/analyzers/advanced.ts` | analyzeAdvancedSEO(crawlResult, robotsTxt, sitemap): structured data, viewport, render-blocking, page size, load time, robots.txt, sitemap, hreflang, AMP. |
| `src/analyzers/pagespeed.ts` | analyzePageSpeed(pageSpeedData): CWV → issues, Lighthouse scores → issues, audits (top 15) → issues. Uses pagespeed getRatingStatus, getMetricName, getMetricThresholds. |
| `frontend/app.ts` | CONFIG from window.__ENV__. Form: url, mode (single/site), maxPages. Stream or POST sends mode, maxPages. Response: report (single) or siteReport (site). showResults(report, siteReport); PDF/JSON/text: send report or siteReport so server builds correct PDF (single vs site with per-page sections). reset clears currentReport and currentSiteReport. |
| `frontend/index.html` | Placeholders: INJECT_RECAPTCHA_SCRIPT, __INJECT_ENV__. Form + thinking panel + results section. |
| `frontend/styles.css` | Theming (CSS vars), layout, components. |
| `skills/seo-analyzer/SKILL.md` | Human/skill doc: invocation, params, single vs site, CLI examples, checks list. |

---

## Data flow

1. **Single page**: URL → crawlPage → CrawlResult → analyzeBasicSEO + analyzeIntermediateSEO + (analyzeAdvancedSEO + fetchRobotsTxt/fetchSitemap) + optional fetchPageSpeedData → analyzePageSpeed → issues[] → generateReport → SEOReport.
2. **Site**: URL → crawlSite → SiteCrawlResult (pages[]) → optional fetchPageSpeedForSite(first N pages) → analyzeSite(depth, pageSpeedByUrl) → per-page analyzers + PageSpeed when present, aggregate SiteWideIssue → SiteAnalysisResult. PageSpeed runs for up to PAGESPEED_SITE_MODE_MAX_PAGES (e.g. 10) when GOOGLE_PAGESPEED_API_KEY set.
3. **API**: /api/analyze: body url, recaptchaToken, mode?, maxPages? → if mode=site: performSiteAnalysis → { siteReport, textReport }; else performAnalysis → { report, textReport }. /api/analyze/stream: query url, mode?, maxPages? → SSE steps then complete { report, siteReport, textReport }. POST /api/report/pdf: body { report } or { siteReport } → buildPdfReport (single) or buildPdfReportFromSite (lists URLs + per-page SEO). Application/pdf download.
4. **Env**: PORT, JWT_SECRET, GOOGLE_PAGESPEED_API_KEY, RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY, ENABLE_RECAPTCHA, USER_AGENT, REQUEST_TIMEOUT.

---

## Key types (concise)

- **SEOIssue**: category, checkName, status (pass|fail|warning|info), description, currentValue, recommendation, priority, referenceUrl?.
- **CrawlResult**: url, statusCode, html, loadTime, isHttps, contentLength, metadata, headings, images, links, openGraph, twitterCard, structuredData, viewport, favicon, hreflang, hasAmp, renderBlockingResources.
- **SEOReport**: url, analyzedAt, depth, scores (basic/intermediate/advanced/overall), summary (totalChecks, passed, failed, warnings), issues, metadata, recommendations (critical/important/suggestions), pageSpeed?.
- **SiteAnalysisResult**: baseUrl, depth, crawlStats, scores (incl. averagePageScore, lowest/highest), summary, siteWideIssues, pageAnalyses[] (each may have pageSpeed when run in site mode), recommendations, technicalDetails.

---

## Scripts (package.json)

- build, build:frontend, build:all; start (node dist/server.js), start:cli (node dist/index.js); server, dev, dev:server, dev:frontend; analyze; docker:build, docker:run; deploy (gcloud builds submit cloudbuild.yaml).
