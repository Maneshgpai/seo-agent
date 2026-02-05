/**
 * PageSpeed Insights Analyzer
 * Converts PageSpeed data into SEOIssues for reporting
 */

import type { SEOIssue, PageSpeedData, CoreWebVitals, LighthouseScores } from '../types.js';
import { getRatingStatus, getMetricName, getMetricThresholds } from '../pagespeed.js';

/**
 * Analyzes PageSpeed data and generates SEO issues
 */
export function analyzePageSpeed(pageSpeedData: PageSpeedData): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // Analyze Core Web Vitals
  issues.push(...analyzeCoreWebVitals(pageSpeedData.coreWebVitals));

  // Analyze Lighthouse scores
  issues.push(...analyzeLighthouseScores(pageSpeedData.lighthouseScores));

  // Analyze individual audit failures
  issues.push(...analyzeAudits(pageSpeedData.audits));

  return issues;
}

/**
 * Generates issues for Core Web Vitals metrics
 */
function analyzeCoreWebVitals(cwv: CoreWebVitals): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // LCP - Largest Contentful Paint
  if (cwv.lcp) {
    const thresholds = getMetricThresholds('lcp');
    issues.push({
      category: 'advanced',
      checkName: getMetricName('lcp'),
      status: getRatingStatus(cwv.lcp.rating),
      description: `LCP measures loading performance. ${getStatusDescription(cwv.lcp.rating)}`,
      currentValue: cwv.lcp.displayValue,
      recommendation: cwv.lcp.rating === 'good'
        ? 'LCP is within recommended threshold'
        : `Improve LCP to ${thresholds.good}. Optimize images, preload critical resources, and reduce server response time.`,
      priority: cwv.lcp.rating === 'poor' ? 'high' : cwv.lcp.rating === 'needs-improvement' ? 'medium' : 'low',
      referenceUrl: 'https://web.dev/articles/lcp',
    });
  }

  // CLS - Cumulative Layout Shift
  if (cwv.cls) {
    const thresholds = getMetricThresholds('cls');
    issues.push({
      category: 'advanced',
      checkName: getMetricName('cls'),
      status: getRatingStatus(cwv.cls.rating),
      description: `CLS measures visual stability. ${getStatusDescription(cwv.cls.rating)}`,
      currentValue: cwv.cls.displayValue,
      recommendation: cwv.cls.rating === 'good'
        ? 'CLS is within recommended threshold'
        : `Improve CLS to ${thresholds.good}. Set explicit dimensions on images/videos, avoid inserting content above existing content.`,
      priority: cwv.cls.rating === 'poor' ? 'high' : cwv.cls.rating === 'needs-improvement' ? 'medium' : 'low',
      referenceUrl: 'https://web.dev/articles/cls',
    });
  }

  // INP - Interaction to Next Paint (newer metric replacing FID)
  if (cwv.inp) {
    const thresholds = getMetricThresholds('inp');
    issues.push({
      category: 'advanced',
      checkName: getMetricName('inp'),
      status: getRatingStatus(cwv.inp.rating),
      description: `INP measures responsiveness to user interactions. ${getStatusDescription(cwv.inp.rating)}`,
      currentValue: cwv.inp.displayValue,
      recommendation: cwv.inp.rating === 'good'
        ? 'INP is within recommended threshold'
        : `Improve INP to ${thresholds.good}. Break up long tasks, optimize event handlers, reduce JavaScript execution time.`,
      priority: cwv.inp.rating === 'poor' ? 'high' : cwv.inp.rating === 'needs-improvement' ? 'medium' : 'low',
      referenceUrl: 'https://web.dev/articles/inp',
    });
  } else if (cwv.fid) {
    // Fall back to FID if INP not available
    const thresholds = getMetricThresholds('fid');
    issues.push({
      category: 'advanced',
      checkName: getMetricName('fid'),
      status: getRatingStatus(cwv.fid.rating),
      description: `FID measures interactivity. ${getStatusDescription(cwv.fid.rating)}`,
      currentValue: cwv.fid.displayValue,
      recommendation: cwv.fid.rating === 'good'
        ? 'FID is within recommended threshold'
        : `Improve FID to ${thresholds.good}. Reduce JavaScript execution, break up long tasks, optimize third-party scripts.`,
      priority: cwv.fid.rating === 'poor' ? 'high' : cwv.fid.rating === 'needs-improvement' ? 'medium' : 'low',
      referenceUrl: 'https://web.dev/articles/fid',
    });
  }

  // TTFB - Time to First Byte
  if (cwv.ttfb) {
    const thresholds = getMetricThresholds('ttfb');
    issues.push({
      category: 'advanced',
      checkName: getMetricName('ttfb'),
      status: getRatingStatus(cwv.ttfb.rating),
      description: `TTFB measures server response time. ${getStatusDescription(cwv.ttfb.rating)}`,
      currentValue: cwv.ttfb.displayValue,
      recommendation: cwv.ttfb.rating === 'good'
        ? 'TTFB is within recommended threshold'
        : `Improve TTFB to ${thresholds.good}. Optimize server, use CDN, implement caching, reduce redirects.`,
      priority: cwv.ttfb.rating === 'poor' ? 'high' : cwv.ttfb.rating === 'needs-improvement' ? 'medium' : 'low',
      referenceUrl: 'https://web.dev/articles/ttfb',
    });
  }

  return issues;
}

/**
 * Generates issues for Lighthouse category scores
 */
function analyzeLighthouseScores(scores: LighthouseScores): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // Performance score
  if (scores.performance !== null) {
    issues.push(createScoreIssue(
      'Lighthouse Performance Score',
      scores.performance,
      'Overall performance based on Core Web Vitals and other metrics',
      'Improve Core Web Vitals metrics, optimize images, reduce JavaScript, and enable caching',
      'https://developer.chrome.com/docs/lighthouse/performance/'
    ));
  }

  // Accessibility score
  if (scores.accessibility !== null) {
    issues.push(createScoreIssue(
      'Lighthouse Accessibility Score',
      scores.accessibility,
      'Accessibility for users with disabilities',
      'Add alt text, ensure color contrast, use semantic HTML, and add ARIA labels',
      'https://developer.chrome.com/docs/lighthouse/accessibility/'
    ));
  }

  // Best Practices score
  if (scores.bestPractices !== null) {
    issues.push(createScoreIssue(
      'Lighthouse Best Practices Score',
      scores.bestPractices,
      'Web development best practices',
      'Use HTTPS, avoid deprecated APIs, fix console errors, and follow security best practices',
      'https://developer.chrome.com/docs/lighthouse/best-practices/'
    ));
  }

  // SEO score from Lighthouse
  if (scores.seo !== null) {
    issues.push(createScoreIssue(
      'Lighthouse SEO Score',
      scores.seo,
      'Basic SEO best practices as measured by Lighthouse',
      'Ensure crawlability, mobile-friendliness, and proper meta tags',
      'https://developer.chrome.com/docs/lighthouse/seo/'
    ));
  }

  return issues;
}

/**
 * Creates a score-based issue with appropriate status
 */
function createScoreIssue(
  checkName: string,
  score: number,
  description: string,
  improvementTip: string,
  referenceUrl: string
): SEOIssue {
  let status: 'pass' | 'warning' | 'fail';
  let priority: 'high' | 'medium' | 'low';

  if (score >= 90) {
    status = 'pass';
    priority = 'low';
  } else if (score >= 50) {
    status = 'warning';
    priority = 'medium';
  } else {
    status = 'fail';
    priority = 'high';
  }

  return {
    category: 'advanced',
    checkName,
    status,
    description: `${description}. Score: ${score}/100`,
    currentValue: `${score}/100`,
    recommendation: status === 'pass'
      ? `${checkName} is good`
      : improvementTip,
    priority,
    referenceUrl,
  };
}

/**
 * Generates issues from individual Lighthouse audits
 */
function analyzeAudits(audits: PageSpeedData['audits']): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // Limit to top 15 most impactful audits to avoid overwhelming the report
  const topAudits = audits.slice(0, 15);

  for (const audit of topAudits) {
    // Skip audits with null scores (informational)
    if (audit.score === null) continue;

    let status: 'pass' | 'warning' | 'fail';
    let priority: 'high' | 'medium' | 'low';

    if (audit.score >= 0.9) {
      // Skip passing audits - we only want to show issues
      continue;
    } else if (audit.score >= 0.5) {
      status = 'warning';
      priority = 'medium';
    } else {
      status = 'fail';
      priority = 'high';
    }

    issues.push({
      category: 'advanced',
      checkName: `[Lighthouse] ${audit.title}`,
      status,
      description: audit.description,
      currentValue: audit.displayValue || `Score: ${Math.round(audit.score * 100)}/100`,
      recommendation: `Address this Lighthouse audit to improve overall performance`,
      priority,
    });
  }

  return issues;
}

/**
 * Gets human-readable status description
 */
function getStatusDescription(rating: 'good' | 'needs-improvement' | 'poor'): string {
  switch (rating) {
    case 'good':
      return 'Currently performing well.';
    case 'needs-improvement':
      return 'Needs improvement for better user experience.';
    case 'poor':
      return 'Poor performance - requires immediate attention.';
  }
}
