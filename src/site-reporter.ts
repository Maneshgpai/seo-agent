/**
 * Site-Wide Report Generator
 * Generates comprehensive reports for entire website SEO analysis
 */

import type { SiteAnalysisResult, SiteWideIssue, PageAnalysis } from './site-analyzer.js';
import { formatCruxCollectionPeriod } from './crux.js';

/**
 * Formats site-wide report as human-readable text
 */
export function formatSiteReportAsText(report: SiteAnalysisResult): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(80));
  lines.push('                     SITE-WIDE SEO ANALYSIS REPORT');
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(`Website:     ${report.baseUrl}`);
  lines.push(`Analyzed:    ${new Date(report.analyzedAt).toLocaleString()}`);
  lines.push(`Depth:       ${report.depth}`);
  lines.push('');

  // Crawl Statistics
  lines.push('─'.repeat(80));
  lines.push('                          CRAWL STATISTICS');
  lines.push('─'.repeat(80));
  lines.push('');
  lines.push(`  Pages Discovered:  ${report.crawlStats.totalDiscovered}`);
  lines.push(`  Pages Crawled:     ${report.crawlStats.totalCrawled}`);
  lines.push(`  Failed Pages:      ${report.crawlStats.failedPages}`);
  lines.push(`  Crawl Duration:    ${(report.crawlStats.crawlDuration / 1000).toFixed(1)}s`);
  lines.push('');

  // Overall Scores
  lines.push('─'.repeat(80));
  lines.push('                           OVERALL SCORES');
  lines.push('─'.repeat(80));
  lines.push('');
  lines.push(`  Overall Score:     ${getScoreBar(report.scores.overall)} ${report.scores.overall}/100 (${getGrade(report.scores.overall)})`);
  lines.push('');
  lines.push(`  Basic SEO:         ${getScoreBar(report.scores.basic)} ${report.scores.basic}/100`);
  lines.push(`  Intermediate SEO:  ${getScoreBar(report.scores.intermediate)} ${report.scores.intermediate}/100`);
  lines.push(`  Advanced SEO:      ${getScoreBar(report.scores.advanced)} ${report.scores.advanced}/100`);
  lines.push('');
  lines.push('  Page Scores:');
  lines.push(`    Average:         ${report.scores.averagePageScore}/100`);
  lines.push(`    Highest:         ${report.scores.highestPageScore}/100`);
  lines.push(`    Lowest:          ${report.scores.lowestPageScore}/100`);
  lines.push('');

  // Technical Overview
  lines.push('─'.repeat(80));
  lines.push('                        TECHNICAL OVERVIEW');
  lines.push('─'.repeat(80));
  lines.push('');
  lines.push(`  robots.txt:        ${report.technicalDetails.hasRobotsTxt ? '✓ Present' : '✗ Missing'}`);
  lines.push(`  XML Sitemap:       ${report.technicalDetails.hasSitemap ? `✓ Present (${report.technicalDetails.sitemapUrlCount} URLs)` : '✗ Missing'}`);
  lines.push(`  HTTPS Usage:       ${report.technicalDetails.httpsPages}/${report.crawlStats.totalCrawled} pages (${Math.round(report.technicalDetails.httpsPages / report.crawlStats.totalCrawled * 100)}%)`);
  lines.push(`  Avg Load Time:     ${report.technicalDetails.averageLoadTime}ms`);
  lines.push(`  Total Page Size:   ${formatBytes(report.technicalDetails.totalPageSize)}`);
  lines.push('');

  // SSL & Mixed Content (report-only; never logged)
  if (report.sslSecurity) {
    lines.push('─'.repeat(80));
    lines.push('                    SSL & MIXED CONTENT');
    lines.push('─'.repeat(80));
    lines.push('');
    lines.push(`  SSL Certificate:  ${report.sslSecurity.sslValid ? '✓ Valid' : `✗ Invalid (${report.sslSecurity.sslError || 'unknown'})`}`);
    lines.push(`  Mixed Content:    ${report.sslSecurity.mixedContent.hasMixedContent ? `✗ ${report.sslSecurity.mixedContent.insecureUrls.length} insecure resource(s) loaded` : '✓ None detected'}`);
    if (report.sslSecurity.mixedContent.hasMixedContent && report.sslSecurity.mixedContent.insecureUrls.length > 0) {
      report.sslSecurity.mixedContent.insecureUrls.slice(0, 10).forEach((u) => lines.push(`    - ${truncateUrl(u, 65)}`));
      if (report.sslSecurity.mixedContent.insecureUrls.length > 10) {
        lines.push(`    ... and ${report.sslSecurity.mixedContent.insecureUrls.length - 10} more`);
      }
    }
    lines.push('');
  }

  // Real User Metrics (CrUX) — site-level when available
  if (report.cruxOrigin?.coreWebVitals) {
    const cwv = report.cruxOrigin.coreWebVitals;
    const getIcon = (r: string) => (r === 'good' ? '✓' : r === 'needs-improvement' ? '⚠' : '✗');
    lines.push('─'.repeat(80));
    lines.push('                 REAL USER METRICS (Chrome UX Report – site)');
    lines.push('─'.repeat(80));
    lines.push('');
    if (cwv.lcp) lines.push(`  LCP:  ${getIcon(cwv.lcp.rating)} ${cwv.lcp.displayValue}`);
    if (cwv.cls) lines.push(`  CLS:  ${getIcon(cwv.cls.rating)} ${cwv.cls.displayValue}`);
    if (cwv.fcp) lines.push(`  FCP:  ${getIcon(cwv.fcp.rating)} ${cwv.fcp.displayValue}`);
    if (cwv.inp) lines.push(`  INP:  ${getIcon(cwv.inp.rating)} ${cwv.inp.displayValue}`);
    if (cwv.ttfb) lines.push(`  TTFB: ${getIcon(cwv.ttfb.rating)} ${cwv.ttfb.displayValue}`);
    lines.push(`  Period: ${formatCruxCollectionPeriod(report.cruxOrigin.collectionPeriod)}`);
    lines.push('');
  }

  // Summary
  lines.push('─'.repeat(80));
  lines.push('                             SUMMARY');
  lines.push('─'.repeat(80));
  lines.push('');
  lines.push(`  Total Issues Found:   ${report.summary.totalIssues}`);
  lines.push(`  Site-Wide Issues:     ${report.summary.siteWideIssues}`);
  lines.push(`  ✗ Critical Issues:    ${report.summary.criticalIssues}`);
  lines.push(`  ⚠ Warnings:           ${report.summary.warnings}`);
  lines.push(`  ✓ Checks Passed:      ${report.summary.passed}`);
  lines.push('');

  // Critical Issues
  if (report.recommendations.critical.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('                    CRITICAL ISSUES (Fix Immediately)');
    lines.push('─'.repeat(80));
    lines.push('');
    report.recommendations.critical.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  // Important Issues
  if (report.recommendations.important.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('                    IMPORTANT ISSUES (Should Fix)');
    lines.push('─'.repeat(80));
    lines.push('');
    report.recommendations.important.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  // Suggestions
  if (report.recommendations.suggestions.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('                      SUGGESTIONS (Nice to Have)');
    lines.push('─'.repeat(80));
    lines.push('');
    report.recommendations.suggestions.slice(0, 10).forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    if (report.recommendations.suggestions.length > 10) {
      lines.push(`  ... and ${report.recommendations.suggestions.length - 10} more suggestions`);
    }
    lines.push('');
  }

  // Site-Wide Issues Detail
  lines.push('─'.repeat(80));
  lines.push('                      SITE-WIDE ISSUES DETAIL');
  lines.push('─'.repeat(80));
  lines.push('');

  const siteWideOnly = report.siteWideIssues.filter(i => i.issueType === 'site-wide');
  
  if (siteWideOnly.length === 0) {
    lines.push('  No site-wide issues found. Issues are page-specific.');
  } else {
    for (const issue of siteWideOnly.slice(0, 15)) {
      const icon = issue.priority === 'high' ? '✗' : issue.priority === 'medium' ? '⚠' : 'ℹ';
      lines.push(`  ${icon} [${issue.category.toUpperCase()}] ${issue.checkName}`);
      lines.push(`     Affected: ${issue.affectedPages}/${issue.totalPages} pages (${issue.percentage}%)`);
      lines.push(`     ${issue.description}`);
      lines.push(`     → ${issue.recommendation}`);
      if (issue.examples.length > 0) {
        lines.push(`     Examples:`);
        for (const ex of issue.examples.slice(0, 3)) {
          lines.push(`       - ${truncateUrl(ex.url, 50)}`);
        }
      }
      lines.push('');
    }
  }

  // Worst Performing Pages
  lines.push('─'.repeat(80));
  lines.push('                     PAGES NEEDING ATTENTION');
  lines.push('─'.repeat(80));
  lines.push('');

  const worstPages = [...report.pageAnalyses]
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  if (worstPages.length > 0) {
    lines.push('  Lowest Scoring Pages:');
    lines.push('');
    for (const page of worstPages) {
      lines.push(`    ${getScoreBar(page.score, 10)} ${page.score}/100  ${truncateUrl(page.url, 45)}`);
      lines.push(`       ${page.criticalCount} critical, ${page.warningCount} warnings`);
    }
  }
  lines.push('');

  // Best Performing Pages
  lines.push('  Highest Scoring Pages:');
  lines.push('');
  const bestPages = [...report.pageAnalyses]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const page of bestPages) {
    lines.push(`    ${getScoreBar(page.score, 10)} ${page.score}/100  ${truncateUrl(page.url, 45)}`);
  }
  lines.push('');

  // Footer
  lines.push('═'.repeat(80));
  lines.push('                      End of Site-Wide SEO Report');
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(generateSiteSummaryLine(report));

  return lines.join('\n');
}

/**
 * Creates a visual score bar
 */
function getScoreBar(score: number, length: number = 20): string {
  const filled = Math.round((score / 100) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Gets letter grade from score
 */
function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Formats bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Truncates URL for display
 */
function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

/**
 * Generates summary one-liner
 */
export function generateSiteSummaryLine(report: SiteAnalysisResult): string {
  const grade = getGrade(report.scores.overall);
  return `Site SEO Score: ${report.scores.overall}/100 (Grade: ${grade}) | ${report.crawlStats.totalCrawled} pages | ${report.summary.criticalIssues} critical, ${report.summary.warnings} warnings`;
}

/**
 * Formats report as JSON
 */
export function formatSiteReportAsJson(report: SiteAnalysisResult): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generates a condensed executive summary
 */
export function generateExecutiveSummary(report: SiteAnalysisResult): string {
  const lines: string[] = [];
  
  lines.push('EXECUTIVE SUMMARY');
  lines.push('─'.repeat(40));
  lines.push('');
  lines.push(`Website: ${report.baseUrl}`);
  lines.push(`Overall Score: ${report.scores.overall}/100 (Grade ${getGrade(report.scores.overall)})`);
  lines.push(`Pages Analyzed: ${report.crawlStats.totalCrawled}`);
  lines.push('');
  
  lines.push('Key Findings:');
  if (report.summary.criticalIssues > 0) {
    lines.push(`  • ${report.summary.criticalIssues} critical issues require immediate attention`);
  }
  if (report.summary.siteWideIssues > 0) {
    lines.push(`  • ${report.summary.siteWideIssues} issues affect multiple pages site-wide`);
  }
  if (!report.technicalDetails.hasSitemap) {
    lines.push(`  • No XML sitemap found`);
  }
  if (report.technicalDetails.httpPages > 0) {
    lines.push(`  • ${report.technicalDetails.httpPages} pages not using HTTPS`);
  }
  
  lines.push('');
  lines.push('Top 3 Priorities:');
  report.recommendations.critical.slice(0, 3).forEach((rec, i) => {
    lines.push(`  ${i + 1}. ${rec}`);
  });
  
  return lines.join('\n');
}
