/**
 * Google PageSpeed Insights API Module
 * Fetches and parses PageSpeed data including Core Web Vitals and Lighthouse audits
 */

import type {
  PageSpeedData,
  CoreWebVitals,
  CoreWebVitalMetric,
  LighthouseScores,
  LighthouseAudit,
  MetricRating,
} from './types.js';

// PageSpeed Insights API endpoint
const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Request timeout for PageSpeed API (can take a while)
const PSI_TIMEOUT = 120000; // 2 minutes

/**
 * Fetches PageSpeed Insights data for a given URL
 * Returns null if the API call fails
 */
export async function fetchPageSpeedData(
  url: string,
  apiKey: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedData | null> {
  try {
    // Build API URL with all categories
    const apiUrl = new URL(PSI_API_URL);
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('key', apiKey);
    apiUrl.searchParams.set('strategy', strategy);
    // Request all Lighthouse categories
    apiUrl.searchParams.append('category', 'performance');
    apiUrl.searchParams.append('category', 'accessibility');
    apiUrl.searchParams.append('category', 'best-practices');
    apiUrl.searchParams.append('category', 'seo');

    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PSI_TIMEOUT);

    const response = await fetch(apiUrl.toString(), {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PageSpeed API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    return parsePageSpeedResponse(data, url, strategy);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error('PageSpeed API request timed out');
    } else {
      console.error(`PageSpeed API error: ${(error as Error).message}`);
    }
    return null;
  }
}

/**
 * Parses the raw PageSpeed API response into our structured format
 */
function parsePageSpeedResponse(
  data: any,
  url: string,
  strategy: 'mobile' | 'desktop'
): PageSpeedData {
  const lighthouseResult = data.lighthouseResult || {};
  const audits = lighthouseResult.audits || {};
  const categories = lighthouseResult.categories || {};

  return {
    url,
    strategy,
    fetchedAt: new Date().toISOString(),
    coreWebVitals: extractCoreWebVitals(audits),
    lighthouseScores: extractLighthouseScores(categories),
    audits: extractRelevantAudits(audits, categories),
  };
}

/**
 * Extracts Core Web Vitals from Lighthouse audits
 */
function extractCoreWebVitals(audits: any): CoreWebVitals {
  return {
    lcp: extractMetric(audits['largest-contentful-paint']),
    cls: extractMetric(audits['cumulative-layout-shift']),
    fid: extractMetric(audits['max-potential-fid']),
    inp: extractMetric(audits['interaction-to-next-paint']),
    ttfb: extractMetric(audits['server-response-time']),
  };
}

/**
 * Extracts a single metric from audit data
 */
function extractMetric(audit: any): CoreWebVitalMetric | null {
  if (!audit || audit.score === undefined) {
    return null;
  }

  // Determine rating based on score (0-1 scale)
  let rating: MetricRating;
  if (audit.score >= 0.9) {
    rating = 'good';
  } else if (audit.score >= 0.5) {
    rating = 'needs-improvement';
  } else {
    rating = 'poor';
  }

  return {
    value: audit.numericValue || 0,
    rating,
    displayValue: audit.displayValue || formatMetricValue(audit.numericValue, audit.id),
  };
}

/**
 * Formats metric value for display when displayValue is not provided
 */
function formatMetricValue(value: number | undefined, auditId: string): string {
  if (value === undefined) return 'N/A';

  // CLS is unitless with small decimal values
  if (auditId === 'cumulative-layout-shift') {
    return value.toFixed(3);
  }

  // Time-based metrics in milliseconds
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} s`;
  }
  return `${Math.round(value)} ms`;
}

/**
 * Extracts Lighthouse category scores
 */
function extractLighthouseScores(categories: any): LighthouseScores {
  return {
    performance: categories.performance?.score != null
      ? Math.round(categories.performance.score * 100)
      : null,
    accessibility: categories.accessibility?.score != null
      ? Math.round(categories.accessibility.score * 100)
      : null,
    bestPractices: categories['best-practices']?.score != null
      ? Math.round(categories['best-practices'].score * 100)
      : null,
    seo: categories.seo?.score != null
      ? Math.round(categories.seo.score * 100)
      : null,
  };
}

/**
 * Extracts relevant audits that failed or need improvement
 * Focuses on actionable items with scores below 1
 */
function extractRelevantAudits(audits: any, categories: any): LighthouseAudit[] {
  const relevantAudits: LighthouseAudit[] = [];
  const processedIds = new Set<string>();

  // Get audit refs from all categories to find important audits
  const allAuditRefs: string[] = [];
  for (const category of Object.values(categories)) {
    const refs = (category as any).auditRefs || [];
    for (const ref of refs) {
      if (ref.id && !allAuditRefs.includes(ref.id)) {
        allAuditRefs.push(ref.id);
      }
    }
  }

  // Process audits that are referenced in categories
  for (const auditId of allAuditRefs) {
    const audit = audits[auditId];
    if (!audit || processedIds.has(auditId)) continue;

    // Skip informational audits and perfect scores
    if (audit.scoreDisplayMode === 'informative' ||
        audit.scoreDisplayMode === 'notApplicable' ||
        audit.scoreDisplayMode === 'manual') {
      continue;
    }

    // Include audits with score < 1 (not perfect)
    if (audit.score !== null && audit.score < 1) {
      processedIds.add(auditId);
      relevantAudits.push({
        id: auditId,
        title: audit.title || auditId,
        description: cleanDescription(audit.description || ''),
        score: audit.score,
        scoreDisplayMode: audit.scoreDisplayMode || 'numeric',
        displayValue: audit.displayValue,
        numericValue: audit.numericValue,
      });
    }
  }

  // Sort by score (worst first) then by title
  relevantAudits.sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.title.localeCompare(b.title);
  });

  return relevantAudits;
}

/**
 * Cleans audit description by removing markdown links
 */
function cleanDescription(description: string): string {
  // Remove markdown links [text](url) -> text
  return description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/**
 * Gets rating color/status for display purposes
 */
export function getRatingStatus(rating: MetricRating): 'pass' | 'warning' | 'fail' {
  switch (rating) {
    case 'good':
      return 'pass';
    case 'needs-improvement':
      return 'warning';
    case 'poor':
      return 'fail';
  }
}

/**
 * Gets human-readable metric names
 */
export function getMetricName(metricKey: string): string {
  const names: Record<string, string> = {
    lcp: 'Largest Contentful Paint (LCP)',
    cls: 'Cumulative Layout Shift (CLS)',
    fid: 'First Input Delay (FID)',
    inp: 'Interaction to Next Paint (INP)',
    ttfb: 'Time to First Byte (TTFB)',
  };
  return names[metricKey] || metricKey;
}

/**
 * Gets threshold information for Core Web Vitals
 */
export function getMetricThresholds(metricKey: string): { good: string; poor: string } {
  const thresholds: Record<string, { good: string; poor: string }> = {
    lcp: { good: '≤ 2.5s', poor: '> 4.0s' },
    cls: { good: '≤ 0.1', poor: '> 0.25' },
    fid: { good: '≤ 100ms', poor: '> 300ms' },
    inp: { good: '≤ 200ms', poor: '> 500ms' },
    ttfb: { good: '≤ 800ms', poor: '> 1800ms' },
  };
  return thresholds[metricKey] || { good: 'N/A', poor: 'N/A' };
}
