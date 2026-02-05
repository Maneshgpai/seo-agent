/**
 * Advanced SEO Analyzer
 * Checks: structured data, viewport, Core Web Vitals hints, sitemap, robots.txt, hreflang, AMP
 */

import type { CrawlResult, SEOIssue } from '../types.js';

/**
 * Runs all advanced SEO checks on the crawl result
 */
export function analyzeAdvancedSEO(
  crawlResult: CrawlResult,
  robotsTxt: string | null,
  sitemap: string | null
): SEOIssue[] {
  const issues: SEOIssue[] = [];

  issues.push(...checkStructuredData(crawlResult));
  issues.push(...checkViewport(crawlResult));
  issues.push(...checkRenderBlockingResources(crawlResult));
  issues.push(...checkPageSize(crawlResult));
  issues.push(...checkLoadTime(crawlResult));
  issues.push(...checkRobotsTxt(crawlResult, robotsTxt));
  issues.push(...checkSitemap(crawlResult, sitemap));
  issues.push(...checkHreflang(crawlResult));
  issues.push(...checkAmp(crawlResult));

  return issues;
}

/**
 * Checks for structured data (JSON-LD)
 */
function checkStructuredData(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const structuredData = crawlResult.structuredData;

  if (structuredData.length === 0) {
    issues.push({
      category: 'advanced',
      checkName: 'Structured Data',
      status: 'warning',
      description: 'No structured data (JSON-LD) found on the page',
      currentValue: null,
      recommendation: 'Add Schema.org structured data to enable rich snippets in search results',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    });
  } else {
    const types = structuredData.map(sd => sd.type).join(', ');
    
    // Check for common recommended types
    const hasWebSite = structuredData.some(sd => sd.type === 'WebSite');
    const hasOrganization = structuredData.some(sd => 
      sd.type === 'Organization' || sd.type === 'LocalBusiness'
    );
    const hasBreadcrumb = structuredData.some(sd => sd.type === 'BreadcrumbList');
    const hasArticle = structuredData.some(sd => 
      sd.type === 'Article' || sd.type === 'NewsArticle' || sd.type === 'BlogPosting'
    );
    const hasProduct = structuredData.some(sd => sd.type === 'Product');
    const hasFaq = structuredData.some(sd => sd.type === 'FAQPage');

    issues.push({
      category: 'advanced',
      checkName: 'Structured Data',
      status: 'pass',
      description: `Found ${structuredData.length} structured data block(s)`,
      currentValue: types,
      recommendation: 'Structured data is implemented',
      priority: 'low',
      referenceUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    });

    // Suggest additional schema types if appropriate
    const suggestions: string[] = [];
    if (!hasWebSite) suggestions.push('WebSite');
    if (!hasBreadcrumb) suggestions.push('BreadcrumbList');

    if (suggestions.length > 0) {
      issues.push({
        category: 'advanced',
        checkName: 'Structured Data Enhancement',
        status: 'info',
        description: `Consider adding more schema types for richer results`,
        currentValue: `Current: ${types}`,
        recommendation: `Consider adding: ${suggestions.join(', ')}`,
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks viewport meta tag for mobile optimization
 */
function checkViewport(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const viewport = crawlResult.viewport;

  if (!viewport) {
    issues.push({
      category: 'advanced',
      checkName: 'Viewport Meta Tag',
      status: 'fail',
      description: 'Page is missing viewport meta tag',
      currentValue: null,
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile optimization',
      priority: 'high',
      referenceUrl: 'https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing',
    });
  } else {
    const hasWidth = viewport.includes('width=');
    const hasInitialScale = viewport.includes('initial-scale=');

    if (!hasWidth || !hasInitialScale) {
      issues.push({
        category: 'advanced',
        checkName: 'Viewport Configuration',
        status: 'warning',
        description: 'Viewport meta tag may be incomplete',
        currentValue: viewport,
        recommendation: 'Ensure viewport includes width=device-width and initial-scale=1',
        priority: 'medium',
      });
    } else if (viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1')) {
      issues.push({
        category: 'advanced',
        checkName: 'Viewport Accessibility',
        status: 'warning',
        description: 'Viewport prevents user zooming',
        currentValue: viewport,
        recommendation: 'Remove user-scalable=no and maximum-scale restrictions for accessibility',
        priority: 'medium',
        referenceUrl: 'https://dequeuniversity.com/rules/axe/4.4/meta-viewport',
      });
    } else {
      issues.push({
        category: 'advanced',
        checkName: 'Viewport Meta Tag',
        status: 'pass',
        description: 'Viewport is properly configured for mobile',
        currentValue: viewport,
        recommendation: 'Mobile optimization is correctly set up',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks for render-blocking resources
 */
function checkRenderBlockingResources(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const blocking = crawlResult.renderBlockingResources;

  if (blocking.length === 0) {
    issues.push({
      category: 'advanced',
      checkName: 'Render-Blocking Resources',
      status: 'pass',
      description: 'No render-blocking resources detected in head',
      currentValue: '0 blocking resources',
      recommendation: 'Page load is optimized',
      priority: 'low',
    });
  } else if (blocking.length <= 3) {
    issues.push({
      category: 'advanced',
      checkName: 'Render-Blocking Resources',
      status: 'info',
      description: `Found ${blocking.length} potentially render-blocking resources`,
      currentValue: blocking.slice(0, 3).join(', '),
      recommendation: 'Consider deferring non-critical CSS/JS or using async loading',
      priority: 'low',
      referenceUrl: 'https://web.dev/articles/render-blocking-resources',
    });
  } else {
    issues.push({
      category: 'advanced',
      checkName: 'Render-Blocking Resources',
      status: 'warning',
      description: `Found ${blocking.length} render-blocking resources`,
      currentValue: `${blocking.length} resources (${blocking.slice(0, 2).join(', ')}...)`,
      recommendation: 'Defer non-critical CSS/JS, use async/defer attributes, or inline critical CSS',
      priority: 'medium',
      referenceUrl: 'https://web.dev/articles/render-blocking-resources',
    });
  }

  return issues;
}

/**
 * Checks page size
 */
function checkPageSize(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const sizeKB = Math.round(crawlResult.contentLength / 1024);

  // Thresholds based on web performance best practices
  const WARNING_SIZE_KB = 500;
  const FAIL_SIZE_KB = 1500;

  if (sizeKB > FAIL_SIZE_KB) {
    issues.push({
      category: 'advanced',
      checkName: 'Page Size',
      status: 'warning',
      description: `Page HTML is very large (${sizeKB} KB)`,
      currentValue: `${sizeKB} KB`,
      recommendation: 'Reduce page size by removing unused code, compressing content, and lazy loading',
      priority: 'medium',
      referenceUrl: 'https://web.dev/articles/total-byte-weight',
    });
  } else if (sizeKB > WARNING_SIZE_KB) {
    issues.push({
      category: 'advanced',
      checkName: 'Page Size',
      status: 'info',
      description: `Page HTML size is ${sizeKB} KB`,
      currentValue: `${sizeKB} KB`,
      recommendation: 'Consider optimizing page size for faster load times',
      priority: 'low',
    });
  } else {
    issues.push({
      category: 'advanced',
      checkName: 'Page Size',
      status: 'pass',
      description: `Page HTML size is reasonable (${sizeKB} KB)`,
      currentValue: `${sizeKB} KB`,
      recommendation: 'Page size is well optimized',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks page load time
 */
function checkLoadTime(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const loadTimeSeconds = (crawlResult.loadTime / 1000).toFixed(2);

  // Thresholds
  const GOOD_TIME_MS = 2000;
  const WARNING_TIME_MS = 4000;

  if (crawlResult.loadTime > WARNING_TIME_MS) {
    issues.push({
      category: 'advanced',
      checkName: 'Page Load Time',
      status: 'warning',
      description: `Page took ${loadTimeSeconds}s to load`,
      currentValue: `${loadTimeSeconds} seconds`,
      recommendation: 'Optimize server response time, reduce render-blocking resources, and enable caching',
      priority: 'high',
      referenceUrl: 'https://web.dev/articles/ttfb',
    });
  } else if (crawlResult.loadTime > GOOD_TIME_MS) {
    issues.push({
      category: 'advanced',
      checkName: 'Page Load Time',
      status: 'info',
      description: `Page took ${loadTimeSeconds}s to load`,
      currentValue: `${loadTimeSeconds} seconds`,
      recommendation: 'Consider performance optimizations to reduce load time under 2 seconds',
      priority: 'medium',
    });
  } else {
    issues.push({
      category: 'advanced',
      checkName: 'Page Load Time',
      status: 'pass',
      description: `Page loaded quickly (${loadTimeSeconds}s)`,
      currentValue: `${loadTimeSeconds} seconds`,
      recommendation: 'Page load time is excellent',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks robots.txt
 */
function checkRobotsTxt(crawlResult: CrawlResult, robotsTxt: string | null): SEOIssue[] {
  const issues: SEOIssue[] = [];

  if (!robotsTxt) {
    issues.push({
      category: 'advanced',
      checkName: 'Robots.txt',
      status: 'info',
      description: 'No robots.txt file found',
      currentValue: null,
      recommendation: 'Add a robots.txt file to control crawler access and specify sitemap location',
      priority: 'low',
      referenceUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
    });
  } else {
    // Check for sitemap reference in robots.txt
    const hasSitemap = robotsTxt.toLowerCase().includes('sitemap:');
    
    // Check for disallow all
    const disallowsAll = /disallow:\s*\/\s*$/im.test(robotsTxt);

    if (disallowsAll) {
      issues.push({
        category: 'advanced',
        checkName: 'Robots.txt',
        status: 'warning',
        description: 'Robots.txt may be blocking all crawlers',
        currentValue: 'Disallow: / found',
        recommendation: 'Review robots.txt to ensure important pages are not blocked',
        priority: 'high',
      });
    } else {
      issues.push({
        category: 'advanced',
        checkName: 'Robots.txt',
        status: 'pass',
        description: 'Robots.txt file exists',
        currentValue: hasSitemap ? 'Contains sitemap reference' : 'No sitemap reference',
        recommendation: hasSitemap ? 'Robots.txt is well configured' : 'Consider adding sitemap URL to robots.txt',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks sitemap.xml
 */
function checkSitemap(crawlResult: CrawlResult, sitemap: string | null): SEOIssue[] {
  const issues: SEOIssue[] = [];

  if (!sitemap) {
    issues.push({
      category: 'advanced',
      checkName: 'XML Sitemap',
      status: 'warning',
      description: 'No sitemap.xml found at standard location',
      currentValue: null,
      recommendation: 'Create an XML sitemap to help search engines discover all pages',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview',
    });
  } else {
    // Check if it's valid XML
    const isValidXml = sitemap.includes('<?xml') || sitemap.includes('<urlset') || sitemap.includes('<sitemapindex');

    if (isValidXml) {
      // Count URLs in sitemap
      const urlCount = (sitemap.match(/<loc>/g) || []).length;
      
      issues.push({
        category: 'advanced',
        checkName: 'XML Sitemap',
        status: 'pass',
        description: `Sitemap found with approximately ${urlCount} URLs`,
        currentValue: `${urlCount} URLs`,
        recommendation: 'Sitemap is properly configured',
        priority: 'low',
      });
    } else {
      issues.push({
        category: 'advanced',
        checkName: 'XML Sitemap',
        status: 'warning',
        description: 'Sitemap found but may not be valid XML',
        currentValue: 'Invalid format',
        recommendation: 'Ensure sitemap follows XML sitemap protocol',
        priority: 'medium',
      });
    }
  }

  return issues;
}

/**
 * Checks hreflang tags for internationalization
 */
function checkHreflang(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const hreflang = crawlResult.hreflang;

  if (hreflang.length === 0) {
    issues.push({
      category: 'advanced',
      checkName: 'Hreflang Tags',
      status: 'info',
      description: 'No hreflang tags found (only needed for multilingual sites)',
      currentValue: null,
      recommendation: 'Add hreflang tags if you have content in multiple languages',
      priority: 'low',
      referenceUrl: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
    });
  } else {
    // Check for x-default
    const hasXDefault = hreflang.some(h => h.lang === 'x-default');
    const languages = hreflang.map(h => h.lang).join(', ');

    if (!hasXDefault) {
      issues.push({
        category: 'advanced',
        checkName: 'Hreflang Tags',
        status: 'warning',
        description: `Found ${hreflang.length} hreflang tags but missing x-default`,
        currentValue: languages,
        recommendation: 'Add x-default hreflang to specify the default/fallback page',
        priority: 'low',
      });
    } else {
      issues.push({
        category: 'advanced',
        checkName: 'Hreflang Tags',
        status: 'pass',
        description: `Found ${hreflang.length} hreflang tags including x-default`,
        currentValue: languages,
        recommendation: 'International SEO is properly configured',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks for AMP version
 */
function checkAmp(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];

  if (crawlResult.hasAmp) {
    issues.push({
      category: 'advanced',
      checkName: 'AMP Version',
      status: 'pass',
      description: 'Page has an AMP version available',
      currentValue: 'AMP detected',
      recommendation: 'AMP is implemented for faster mobile loading',
      priority: 'low',
      referenceUrl: 'https://amp.dev/',
    });
  } else {
    issues.push({
      category: 'advanced',
      checkName: 'AMP Version',
      status: 'info',
      description: 'No AMP version detected',
      currentValue: null,
      recommendation: 'Consider AMP for mobile-heavy audiences (optional)',
      priority: 'low',
    });
  }

  return issues;
}
