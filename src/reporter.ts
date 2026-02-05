/**
 * SEO Report Generator
 * Generates formatted reports with scores, findings, and recommendations
 */

import type { SEOIssue, SEOReport, AnalysisDepth, PageMetadata, ScoreBreakdown, PageSpeedData } from './types.js';

/**
 * Generates a complete SEO report from analysis results
 */
export function generateReport(
  url: string,
  depth: AnalysisDepth,
  issues: SEOIssue[],
  metadata: PageMetadata,
  pageSpeedData?: PageSpeedData | null
): SEOReport {
  const scores = calculateScores(issues);
  const summary = calculateSummary(issues);
  const recommendations = categorizeRecommendations(issues);

  return {
    url,
    analyzedAt: new Date().toISOString(),
    depth,
    scores,
    summary,
    issues,
    metadata,
    recommendations,
    pageSpeed: pageSpeedData || undefined,
  };
}

/**
 * Calculates scores based on pass/fail ratios per category
 */
function calculateScores(issues: SEOIssue[]): ScoreBreakdown {
  const basicIssues = issues.filter(i => i.category === 'basic');
  const intermediateIssues = issues.filter(i => i.category === 'intermediate');
  const advancedIssues = issues.filter(i => i.category === 'advanced');

  const basicScore = calculateCategoryScore(basicIssues);
  const intermediateScore = calculateCategoryScore(intermediateIssues);
  const advancedScore = calculateCategoryScore(advancedIssues);

  // Weighted overall score: basic=40%, intermediate=35%, advanced=25%
  const overall = Math.round(
    basicScore * 0.4 + 
    intermediateScore * 0.35 + 
    advancedScore * 0.25
  );

  return {
    basic: basicScore,
    intermediate: intermediateScore,
    advanced: advancedScore,
    overall,
  };
}

/**
 * Calculates score for a category (0-100)
 */
function calculateCategoryScore(issues: SEOIssue[]): number {
  if (issues.length === 0) return 100;

  // Weight by status: pass=1, info=0.9, warning=0.5, fail=0
  const totalWeight = issues.reduce((sum, issue) => {
    switch (issue.status) {
      case 'pass': return sum + 1;
      case 'info': return sum + 0.9;
      case 'warning': return sum + 0.5;
      case 'fail': return sum + 0;
      default: return sum + 0.5;
    }
  }, 0);

  return Math.round((totalWeight / issues.length) * 100);
}

/**
 * Calculates summary statistics
 */
function calculateSummary(issues: SEOIssue[]): SEOReport['summary'] {
  return {
    totalChecks: issues.length,
    passed: issues.filter(i => i.status === 'pass').length,
    failed: issues.filter(i => i.status === 'fail').length,
    warnings: issues.filter(i => i.status === 'warning').length,
  };
}

/**
 * Categorizes recommendations by priority
 */
function categorizeRecommendations(issues: SEOIssue[]): SEOReport['recommendations'] {
  const failed = issues.filter(i => i.status === 'fail');
  const warnings = issues.filter(i => i.status === 'warning');
  const info = issues.filter(i => i.status === 'info');

  return {
    critical: failed.map(i => `[${i.checkName}] ${i.recommendation}`),
    important: warnings.map(i => `[${i.checkName}] ${i.recommendation}`),
    suggestions: info.map(i => `[${i.checkName}] ${i.recommendation}`),
  };
}

/**
 * Formats report as human-readable text
 */
export function formatReportAsText(report: SEOReport): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(70));
  lines.push('                        SEO ANALYSIS REPORT');
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push(`URL: ${report.url}`);
  lines.push(`Analyzed: ${new Date(report.analyzedAt).toLocaleString()}`);
  lines.push(`Depth: ${report.depth}`);
  lines.push('');

  // Overall Score
  lines.push('─'.repeat(70));
  lines.push('                           OVERALL SCORE');
  lines.push('─'.repeat(70));
  lines.push('');
  lines.push(`  Overall:      ${getScoreBar(report.scores.overall)} ${report.scores.overall}/100`);
  lines.push(`  Basic:        ${getScoreBar(report.scores.basic)} ${report.scores.basic}/100`);
  lines.push(`  Intermediate: ${getScoreBar(report.scores.intermediate)} ${report.scores.intermediate}/100`);
  lines.push(`  Advanced:     ${getScoreBar(report.scores.advanced)} ${report.scores.advanced}/100`);
  lines.push('');

  // Summary
  lines.push('─'.repeat(70));
  lines.push('                            SUMMARY');
  lines.push('─'.repeat(70));
  lines.push('');
  lines.push(`  Total Checks: ${report.summary.totalChecks}`);
  lines.push(`  ✓ Passed:     ${report.summary.passed}`);
  lines.push(`  ✗ Failed:     ${report.summary.failed}`);
  lines.push(`  ⚠ Warnings:   ${report.summary.warnings}`);
  lines.push('');

  // PageSpeed Insights sections (if available)
  if (report.pageSpeed) {
    // Core Web Vitals
    lines.push('─'.repeat(70));
    lines.push('                       CORE WEB VITALS');
    lines.push('─'.repeat(70));
    lines.push('');
    
    const cwv = report.pageSpeed.coreWebVitals;
    
    if (cwv.lcp) {
      lines.push(`  LCP (Largest Contentful Paint):    ${getRatingIcon(cwv.lcp.rating)} ${cwv.lcp.displayValue}`);
    }
    if (cwv.cls) {
      lines.push(`  CLS (Cumulative Layout Shift):     ${getRatingIcon(cwv.cls.rating)} ${cwv.cls.displayValue}`);
    }
    if (cwv.inp) {
      lines.push(`  INP (Interaction to Next Paint):   ${getRatingIcon(cwv.inp.rating)} ${cwv.inp.displayValue}`);
    } else if (cwv.fid) {
      lines.push(`  FID (First Input Delay):           ${getRatingIcon(cwv.fid.rating)} ${cwv.fid.displayValue}`);
    }
    if (cwv.ttfb) {
      lines.push(`  TTFB (Time to First Byte):         ${getRatingIcon(cwv.ttfb.rating)} ${cwv.ttfb.displayValue}`);
    }
    lines.push('');
    lines.push('  Legend: ✓ Good  ⚠ Needs Improvement  ✗ Poor');
    lines.push('');

    // Lighthouse Scores
    lines.push('─'.repeat(70));
    lines.push('                      LIGHTHOUSE SCORES');
    lines.push('─'.repeat(70));
    lines.push('');
    
    const lh = report.pageSpeed.lighthouseScores;
    
    if (lh.performance !== null) {
      lines.push(`  Performance:     ${getScoreBar(lh.performance)} ${lh.performance}/100`);
    }
    if (lh.accessibility !== null) {
      lines.push(`  Accessibility:   ${getScoreBar(lh.accessibility)} ${lh.accessibility}/100`);
    }
    if (lh.bestPractices !== null) {
      lines.push(`  Best Practices:  ${getScoreBar(lh.bestPractices)} ${lh.bestPractices}/100`);
    }
    if (lh.seo !== null) {
      lines.push(`  SEO:             ${getScoreBar(lh.seo)} ${lh.seo}/100`);
    }
    lines.push('');
    lines.push(`  Strategy: ${report.pageSpeed.strategy}`);
    lines.push('');
  }

  // Critical Issues
  if (report.recommendations.critical.length > 0) {
    lines.push('─'.repeat(70));
    lines.push('                    CRITICAL ISSUES (Fix Now)');
    lines.push('─'.repeat(70));
    lines.push('');
    report.recommendations.critical.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  // Important Issues
  if (report.recommendations.important.length > 0) {
    lines.push('─'.repeat(70));
    lines.push('                  IMPORTANT ISSUES (Should Fix)');
    lines.push('─'.repeat(70));
    lines.push('');
    report.recommendations.important.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  // Suggestions
  if (report.recommendations.suggestions.length > 0) {
    lines.push('─'.repeat(70));
    lines.push('                    SUGGESTIONS (Nice to Have)');
    lines.push('─'.repeat(70));
    lines.push('');
    report.recommendations.suggestions.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  // Detailed Findings
  lines.push('─'.repeat(70));
  lines.push('                       DETAILED FINDINGS');
  lines.push('─'.repeat(70));
  lines.push('');

  // Group by category
  const categories = ['basic', 'intermediate', 'advanced'] as const;
  
  for (const category of categories) {
    const categoryIssues = report.issues.filter(i => i.category === category);
    if (categoryIssues.length === 0) continue;

    lines.push(`  [${category.toUpperCase()}]`);
    lines.push('');

    for (const issue of categoryIssues) {
      const statusIcon = getStatusIcon(issue.status);
      lines.push(`    ${statusIcon} ${issue.checkName}`);
      lines.push(`       ${issue.description}`);
      if (issue.currentValue) {
        lines.push(`       Current: ${truncate(issue.currentValue, 50)}`);
      }
      if (issue.status !== 'pass') {
        lines.push(`       → ${issue.recommendation}`);
      }
      if (issue.referenceUrl) {
        lines.push(`       Ref: ${issue.referenceUrl}`);
      }
      lines.push('');
    }
  }

  lines.push('═'.repeat(70));
  lines.push('                    End of SEO Analysis Report');
  lines.push('═'.repeat(70));

  return lines.join('\n');
}

/**
 * Creates a visual score bar
 */
function getScoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Gets status icon for display
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass': return '✓';
    case 'fail': return '✗';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
    default: return '•';
  }
}

/**
 * Gets rating icon for Core Web Vitals display
 */
function getRatingIcon(rating: 'good' | 'needs-improvement' | 'poor'): string {
  switch (rating) {
    case 'good': return '✓';
    case 'needs-improvement': return '⚠';
    case 'poor': return '✗';
  }
}

/**
 * Truncates string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Formats report as JSON string
 */
export function formatReportAsJson(report: SEOReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Gets a grade letter based on score
 */
export function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generates a summary one-liner for the report
 */
export function generateSummaryLine(report: SEOReport): string {
  const grade = getGrade(report.scores.overall);
  return `SEO Score: ${report.scores.overall}/100 (Grade: ${grade}) - ${report.summary.failed} critical, ${report.summary.warnings} warnings, ${report.summary.passed} passed`;
}
