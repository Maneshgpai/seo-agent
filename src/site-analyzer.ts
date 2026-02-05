/**
 * Site-Wide SEO Analyzer
 * Aggregates and analyzes SEO data across all pages of a website
 */

import { analyzeBasicSEO } from './analyzers/basic.js';
import { analyzeIntermediateSEO } from './analyzers/intermediate.js';
import { analyzeAdvancedSEO } from './analyzers/advanced.js';
import type { 
  CrawlResult, 
  SEOIssue, 
  AnalysisDepth, 
  Category,
  Priority 
} from './types.js';
import type { SiteCrawlResult } from './site-crawler.js';

/**
 * Site-wide issue with page-level details
 */
export interface SiteWideIssue {
  category: Category;
  checkName: string;
  issueType: 'site-wide' | 'page-specific';
  affectedPages: number;
  totalPages: number;
  percentage: number;
  priority: Priority;
  description: string;
  recommendation: string;
  examples: { url: string; value: string | null }[];
  referenceUrl?: string;
}

/**
 * Page-level analysis result
 */
export interface PageAnalysis {
  url: string;
  score: number;
  issues: SEOIssue[];
  criticalCount: number;
  warningCount: number;
}

/**
 * Complete site-wide analysis result
 */
export interface SiteAnalysisResult {
  baseUrl: string;
  analyzedAt: string;
  depth: AnalysisDepth;
  crawlStats: {
    totalDiscovered: number;
    totalCrawled: number;
    failedPages: number;
    crawlDuration: number;
  };
  scores: {
    overall: number;
    basic: number;
    intermediate: number;
    advanced: number;
    averagePageScore: number;
    lowestPageScore: number;
    highestPageScore: number;
  };
  summary: {
    totalIssues: number;
    siteWideIssues: number;
    criticalIssues: number;
    warnings: number;
    passed: number;
  };
  siteWideIssues: SiteWideIssue[];
  pageAnalyses: PageAnalysis[];
  recommendations: {
    critical: string[];
    important: string[];
    suggestions: string[];
  };
  technicalDetails: {
    hasRobotsTxt: boolean;
    hasSitemap: boolean;
    sitemapUrlCount: number;
    httpsPages: number;
    httpPages: number;
    averageLoadTime: number;
    totalPageSize: number;
  };
}

/**
 * Analyzes an entire website's SEO
 */
export function analyzeSite(
  crawlResult: SiteCrawlResult,
  depth: AnalysisDepth = 'all'
): SiteAnalysisResult {
  const pages = crawlResult.pages;
  
  // Analyze each page individually
  const pageAnalyses: PageAnalysis[] = [];
  const allIssuesByCheck = new Map<string, { issue: SEOIssue; pages: { url: string; value: string | null }[] }>();

  for (const page of pages) {
    const pageIssues: SEOIssue[] = [];

    // Run analyzers based on depth
    if (depth === 'basic' || depth === 'all') {
      pageIssues.push(...analyzeBasicSEO(page));
    }
    if (depth === 'intermediate' || depth === 'all') {
      pageIssues.push(...analyzeIntermediateSEO(page));
    }
    if (depth === 'advanced' || depth === 'all') {
      pageIssues.push(...analyzeAdvancedSEO(page, crawlResult.robotsTxt, null));
    }

    // Calculate page score
    const pageScore = calculatePageScore(pageIssues);
    
    pageAnalyses.push({
      url: page.url,
      score: pageScore,
      issues: pageIssues,
      criticalCount: pageIssues.filter(i => i.status === 'fail').length,
      warningCount: pageIssues.filter(i => i.status === 'warning').length,
    });

    // Aggregate issues by check name for site-wide analysis
    for (const issue of pageIssues) {
      const key = `${issue.category}:${issue.checkName}:${issue.status}`;
      
      if (!allIssuesByCheck.has(key)) {
        allIssuesByCheck.set(key, { 
          issue, 
          pages: [] 
        });
      }
      
      allIssuesByCheck.get(key)!.pages.push({
        url: page.url,
        value: issue.currentValue,
      });
    }
  }

  // Generate site-wide issues
  const siteWideIssues = generateSiteWideIssues(allIssuesByCheck, pages.length);

  // Calculate scores
  const scores = calculateSiteScores(pageAnalyses, siteWideIssues);

  // Calculate summary
  const summary = calculateSummary(siteWideIssues, pageAnalyses);

  // Generate recommendations
  const recommendations = generateRecommendations(siteWideIssues);

  // Calculate technical details
  const technicalDetails = calculateTechnicalDetails(crawlResult);

  return {
    baseUrl: crawlResult.baseUrl,
    analyzedAt: new Date().toISOString(),
    depth,
    crawlStats: {
      totalDiscovered: crawlResult.totalPages,
      totalCrawled: crawlResult.crawledPages,
      failedPages: crawlResult.failedPages.length,
      crawlDuration: crawlResult.crawlDuration,
    },
    scores,
    summary,
    siteWideIssues,
    pageAnalyses,
    recommendations,
    technicalDetails,
  };
}

/**
 * Generates site-wide issues from aggregated page issues
 */
function generateSiteWideIssues(
  issuesByCheck: Map<string, { issue: SEOIssue; pages: { url: string; value: string | null }[] }>,
  totalPages: number
): SiteWideIssue[] {
  const siteWideIssues: SiteWideIssue[] = [];

  for (const [key, data] of issuesByCheck) {
    const { issue, pages } = data;
    const percentage = Math.round((pages.length / totalPages) * 100);
    
    // Only include non-pass issues or issues affecting multiple pages
    if (issue.status !== 'pass' || pages.length < totalPages) {
      // Determine if this is a site-wide pattern or page-specific
      const issueType = percentage >= 50 ? 'site-wide' : 'page-specific';
      
      // Adjust priority based on prevalence
      let priority = issue.priority;
      if (percentage >= 80 && issue.status === 'fail') {
        priority = 'high';
      } else if (percentage >= 50 && issue.status === 'warning') {
        priority = 'medium';
      }

      siteWideIssues.push({
        category: issue.category,
        checkName: issue.checkName,
        issueType,
        affectedPages: pages.length,
        totalPages,
        percentage,
        priority,
        description: generateSiteWideDescription(issue, pages.length, totalPages, percentage),
        recommendation: issue.recommendation,
        examples: pages.slice(0, 5), // Show up to 5 examples
        referenceUrl: issue.referenceUrl,
      });
    }
  }

  // Sort by priority and affected percentage
  return siteWideIssues.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { fail: 0, warning: 1, info: 2, pass: 3 };
    
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.percentage - a.percentage;
  });
}

/**
 * Generates description for site-wide issue
 */
function generateSiteWideDescription(
  issue: SEOIssue,
  affectedPages: number,
  totalPages: number,
  percentage: number
): string {
  if (issue.status === 'pass') {
    if (affectedPages === totalPages) {
      return `All ${totalPages} pages pass this check`;
    }
    return `${affectedPages} of ${totalPages} pages (${percentage}%) pass this check`;
  }

  const statusText = issue.status === 'fail' ? 'fail' : 'have issues with';
  
  if (affectedPages === totalPages) {
    return `All ${totalPages} pages ${statusText} this check: ${issue.description}`;
  }
  
  return `${affectedPages} of ${totalPages} pages (${percentage}%) ${statusText}: ${issue.description}`;
}

/**
 * Calculates page score from issues
 */
function calculatePageScore(issues: SEOIssue[]): number {
  if (issues.length === 0) return 100;

  const weights = { pass: 1, info: 0.9, warning: 0.5, fail: 0 };
  const total = issues.reduce((sum, issue) => sum + (weights[issue.status] || 0.5), 0);
  
  return Math.round((total / issues.length) * 100);
}

/**
 * Calculates site-wide scores
 */
function calculateSiteScores(
  pageAnalyses: PageAnalysis[],
  siteWideIssues: SiteWideIssue[]
): SiteAnalysisResult['scores'] {
  const pageScores = pageAnalyses.map(p => p.score);
  const averagePageScore = Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length);
  
  // Calculate category scores from site-wide issues
  const basicIssues = siteWideIssues.filter(i => i.category === 'basic');
  const intermediateIssues = siteWideIssues.filter(i => i.category === 'intermediate');
  const advancedIssues = siteWideIssues.filter(i => i.category === 'advanced');

  const calculateCategoryScore = (issues: SiteWideIssue[]): number => {
    if (issues.length === 0) return 100;
    
    const passPercentages = issues.map(i => {
      if (i.percentage === 100) return 1;
      return 1 - (i.percentage / 100);
    });
    
    return Math.round((passPercentages.reduce((a, b) => a + b, 0) / issues.length) * 100);
  };

  const basic = calculateCategoryScore(basicIssues);
  const intermediate = calculateCategoryScore(intermediateIssues);
  const advanced = calculateCategoryScore(advancedIssues);
  
  // Weighted overall
  const overall = Math.round(basic * 0.4 + intermediate * 0.35 + advanced * 0.25);

  return {
    overall,
    basic,
    intermediate,
    advanced,
    averagePageScore,
    lowestPageScore: Math.min(...pageScores),
    highestPageScore: Math.max(...pageScores),
  };
}

/**
 * Calculates summary statistics
 */
function calculateSummary(
  siteWideIssues: SiteWideIssue[],
  pageAnalyses: PageAnalysis[]
): SiteAnalysisResult['summary'] {
  const criticalIssues = siteWideIssues.filter(i => i.priority === 'high').length;
  const warnings = siteWideIssues.filter(i => i.priority === 'medium').length;
  const siteWide = siteWideIssues.filter(i => i.issueType === 'site-wide').length;
  
  const totalPageIssues = pageAnalyses.reduce((sum, p) => sum + p.issues.length, 0);
  const passedChecks = pageAnalyses.reduce(
    (sum, p) => sum + p.issues.filter(i => i.status === 'pass').length, 
    0
  );

  return {
    totalIssues: siteWideIssues.length,
    siteWideIssues: siteWide,
    criticalIssues,
    warnings,
    passed: passedChecks,
  };
}

/**
 * Generates prioritized recommendations
 */
function generateRecommendations(
  siteWideIssues: SiteWideIssue[]
): SiteAnalysisResult['recommendations'] {
  const critical: string[] = [];
  const important: string[] = [];
  const suggestions: string[] = [];

  for (const issue of siteWideIssues) {
    const prefix = issue.issueType === 'site-wide' 
      ? `[Site-wide: ${issue.percentage}% of pages]` 
      : `[${issue.affectedPages} pages]`;
    
    const rec = `${prefix} [${issue.checkName}] ${issue.recommendation}`;

    if (issue.priority === 'high') {
      critical.push(rec);
    } else if (issue.priority === 'medium') {
      important.push(rec);
    } else {
      suggestions.push(rec);
    }
  }

  return { critical, important, suggestions };
}

/**
 * Calculates technical details from crawl result
 */
function calculateTechnicalDetails(
  crawlResult: SiteCrawlResult
): SiteAnalysisResult['technicalDetails'] {
  const pages = crawlResult.pages;
  
  const httpsPages = pages.filter(p => p.isHttps).length;
  const httpPages = pages.length - httpsPages;
  
  const totalLoadTime = pages.reduce((sum, p) => sum + p.loadTime, 0);
  const averageLoadTime = Math.round(totalLoadTime / pages.length);
  
  const totalPageSize = pages.reduce((sum, p) => sum + p.contentLength, 0);

  return {
    hasRobotsTxt: crawlResult.robotsTxt !== null,
    hasSitemap: crawlResult.sitemapUrls.length > 0,
    sitemapUrlCount: crawlResult.sitemapUrls.length,
    httpsPages,
    httpPages,
    averageLoadTime,
    totalPageSize,
  };
}
