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
| `src/index.ts` | CLI: parseArgs, analyzeSEO (single; PageSpeed + Crux in parallel when both keys set), analyzeSiteWide (site; fetchPageSpeedForSite + fetchCruxForSite in parallel for first N). Exports analyzeSEO, analyzeSiteWide, reporters, types. |
| `src/server.ts` | Express: static `frontend/`, /health, POST /api/analyze, GET /api/analyze/stream (SSE), POST /api/report/pdf. Single: performAnalysis (PageSpeed + Crux in parallel when both keys set) → SEOReport. Site: performSiteAnalysis (crawlSite, fetchPageSpeedForSite + fetchCruxForSite in parallel for first N) → SiteAnalysisResult. PDF: body { report } or { siteReport } → buildPdfReport or buildPdfReportFromSite. Catch-all serves index.html. |
| `src/jwt-middleware.ts` | verifyJWT: Bearer token, jose jwtVerify; issuer aidyne-solutions-website, audience seo-agent-cloud-run. Skip if no JWT_SECRET. |
| `src/types.ts` | AnalysisDepth, Priority, Category, CheckStatus; SEOIssue, PageMetadata, …; CrawlResult; SEOReport (pageSpeed?, crux?), ScoreBreakdown, PageSpeedData, CoreWebVitals, CruxData, CruxCollectionPeriod. |
| `src/crawler.ts` | crawlPage(url, opts): Puppeteer → HTML, Cheerio extract metadata, headings, images, links, OG, Twitter, JSON-LD, viewport, favicon, hreflang, hasAmp, renderBlockingResources. fetchRobotsTxt, fetchSitemap (base URL + /robots.txt, /sitemap.xml). |
| `src/site-crawler.ts` | crawlSite(startUrl, opts): fetchRobotsTxt, fetchSitemap, parse disallow, sitemap <loc>, queue; batch crawl via crawlPage; extract internal links; respect robots, normalize URLs. SiteCrawlResult: baseUrl, pages[], failedPages, sitemapUrls, robotsTxt, crawlDuration. |
| `src/site-analyzer.ts` | analyzeSite(crawlResult, depth, pageSpeedByUrl?, cruxOrigin?, cruxByUrl?): per-page basic/intermediate/advanced; attaches pageSpeed and crux to PageAnalysis when provided. Runs verifySslAndMixedContent for base URL. Aggregate → SiteWideIssue; scores, summary, recommendations, technicalDetails. SiteAnalysisResult may include cruxOrigin, sslSecurity. |
| `src/reporter.ts` | generateReport(url, depth, issues, metadata, pageSpeedData?, cruxData?, sslSecurity?) → SEOReport. formatReportAsText includes CWV, CrUX, SSL & mixed content when present. formatReportAsJson, getGrade, generateSummaryLine. |
| `src/pdf-report.ts` | buildPdfReport(report) → single-page PDF (scores, CWV, Lighthouse, CrUX when present; else CrUX Data Availability section with reason and when available). buildPdfReportFromSite(siteReport) → site PDF: URLs, site scores, CrUX origin, per-page sections (issues, PageSpeed, CrUX when present); else CrUX Data Availability section. pdfmake; Aidyne branding. |
| `src/site-reporter.ts` | formatSiteReportAsText(SiteAnalysisResult): includes CrUX site-level section when cruxOrigin present. formatSiteReportAsJson, generateSiteSummaryLine, generateExecutiveSummary. |
| `src/pagespeed.ts` | fetchPageSpeedData(url, apiKey, strategy): PageSpeed v5 API → coreWebVitals, lighthouseScores, audits. fetchPageSpeedForSite(pages, apiKey, maxPages, concurrency): parallel fetches with concurrency cap. getRatingStatus, getMetricName, getMetricThresholds, getRatingFromNumericValue (used by CrUX). |
| `src/crux.ts` | Chrome UX Report API: fetchCruxRecord, fetchCruxForUrl, fetchCruxForOrigin, fetchCruxForSite(origin, pageUrls, apiKey, maxPages) — origin + per-URL in parallel. Parses CrUX response to CruxData (coreWebVitals from p75); reuses getRatingFromNumericValue. formatCruxCollectionPeriod. |
| `src/analyzers/index.ts` | Re-exports basic, intermediate, advanced, pagespeed. |
| `src/analyzers/basic.ts` | analyzeBasicSEO(crawlResult): title (30–60), meta desc (120–160), H1 (one), heading hierarchy, canonical, robots meta, language, charset. Returns SEOIssue[]. |
| `src/analyzers/intermediate.ts` | analyzeIntermediateSEO: image alt/dimensions/lazy, internal/external links, URL structure, Open Graph, Twitter Card, favicon, HTTPS. |
| `src/ssl-security.ts` | verifySslAndMixedContent(url, html): validates SSL certificate, detects mixed content (HTTP resources on HTTPS pages). Report-only; no logging. |
| `src/analyzers/advanced.ts` | analyzeAdvancedSEO(crawlResult, robotsTxt, sitemap): structured data, viewport, render-blocking, page size, load time, robots.txt, sitemap, hreflang, AMP. |
| `src/analyzers/pagespeed.ts` | analyzePageSpeed(pageSpeedData): CWV → issues, Lighthouse scores → issues, audits (top 15) → issues. Uses pagespeed getRatingStatus, getMetricName, getMetricThresholds. |
| `frontend/app.ts` | CONFIG from window.__ENV__. Form: url, maxPages (default 1). Always Full Site mode—no single/site toggle. Stream or POST sends mode='site', maxPages. Response: siteReport. showResults(report, siteReport); PDF/JSON/text: send siteReport. reset clears currentReport and currentSiteReport. |
| `frontend/index.html` | Placeholders: INJECT_RECAPTCHA_SCRIPT, __INJECT_ENV__. Form + thinking panel + results section. |
| `frontend/styles.css` | Theming (CSS vars), layout, components. |
| `skills/seo-analyzer/SKILL.md` | Human/skill doc: invocation, params, single vs site, CLI examples, checks list. |

---

## Data flow

1. **Single page**: URL → crawlPage → CrawlResult → analyzers (robots + sitemap in parallel for advanced) + (optional fetchPageSpeedData, fetchCruxForUrl in parallel when both keys set) → verifySslAndMixedContent → generateReport(…, pageSpeedData, cruxData, sslSecurity) → SEOReport (pageSpeed?, crux?, sslSecurity?).
2. **Site**: URL → crawlSite → SiteCrawlResult → optional fetchPageSpeedForSite + fetchCruxForSite(origin, first N pages) in parallel when keys set → analyzeSite(depth, pageSpeedByUrl, cruxOrigin, cruxByUrl) → SiteAnalysisResult. analyzeSite runs verifySslAndMixedContent for base URL. PageSpeed runs per-page in parallel (concurrency cap); CrUX runs origin + per-URL in parallel.
3. **API**: /api/analyze, /api/analyze/stream, POST /api/report/pdf — same as before; single/site reports include crux when CRUX_API_KEY set.
4. **Env**: PORT, JWT_SECRET, GOOGLE_PAGESPEED_API_KEY, CRUX_API_KEY (Chrome UX Report API; free, 150 req/min), RECAPTCHA_*, ENABLE_RECAPTCHA, USER_AGENT, REQUEST_TIMEOUT.

---

## Key types (concise)

- **SEOIssue**: category, checkName, status (pass|fail|warning|info), description, currentValue, recommendation, priority, referenceUrl?.
- **CrawlResult**: url, statusCode, html, loadTime, isHttps, contentLength, metadata, headings, images, links, openGraph, twitterCard, structuredData, viewport, favicon, hreflang, hasAmp, renderBlockingResources.
- **SEOReport**: … recommendations, pageSpeed?, crux?, sslSecurity? (SslSecurityCheck: valid SSL, mixed content URLs). cruxUnavailableReason?, cruxWhenAvailable? (set when crux missing; PDF-only).
- **CruxData**: origin?, url?, formFactor?, collectionPeriod, coreWebVitals (lcp, cls, fcp, inp, ttfb).
- **SiteAnalysisResult**: baseUrl, depth, crawlStats, scores, summary, siteWideIssues, pageAnalyses[] (pageSpeed?, crux?), recommendations, technicalDetails, cruxOrigin?, sslSecurity?. cruxUnavailableReason?, cruxWhenAvailable? (set when crux missing; PDF-only).

---

## Scripts (package.json)

- build, build:frontend, build:all; start (node dist/server.js), start:cli (node dist/index.js); server, dev, dev:server, dev:frontend; analyze; docker:build, docker:run; deploy (gcloud builds submit cloudbuild.yaml).
