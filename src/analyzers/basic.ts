/**
 * Basic SEO Analyzer
 * Checks critical SEO elements: title, meta description, headings, canonical, robots
 */

import type { CrawlResult, SEOIssue } from '../types.js';

// Optimal length ranges for SEO elements
const TITLE_MIN_LENGTH = 30;
const TITLE_MAX_LENGTH = 60;
const META_DESC_MIN_LENGTH = 120;
const META_DESC_MAX_LENGTH = 160;

/**
 * Runs all basic SEO checks on the crawl result
 */
export function analyzeBasicSEO(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];

  issues.push(...checkTitle(crawlResult));
  issues.push(...checkMetaDescription(crawlResult));
  issues.push(...checkH1Tag(crawlResult));
  issues.push(...checkHeadingHierarchy(crawlResult));
  issues.push(...checkCanonical(crawlResult));
  issues.push(...checkRobotsMeta(crawlResult));
  issues.push(...checkLanguage(crawlResult));
  issues.push(...checkCharset(crawlResult));

  return issues;
}

/**
 * Checks title tag presence and length
 */
function checkTitle(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const title = crawlResult.metadata.title;

  if (!title) {
    issues.push({
      category: 'basic',
      checkName: 'Title Tag',
      status: 'fail',
      description: 'Page is missing a title tag',
      currentValue: null,
      recommendation: 'Add a unique, descriptive title tag between 30-60 characters',
      priority: 'high',
      referenceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    });
  } else {
    const titleLength = title.length;

    if (titleLength < TITLE_MIN_LENGTH) {
      issues.push({
        category: 'basic',
        checkName: 'Title Tag Length',
        status: 'warning',
        description: `Title is too short (${titleLength} characters)`,
        currentValue: title,
        recommendation: `Expand title to at least ${TITLE_MIN_LENGTH} characters for better SEO impact`,
        priority: 'medium',
        referenceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
      });
    } else if (titleLength > TITLE_MAX_LENGTH) {
      issues.push({
        category: 'basic',
        checkName: 'Title Tag Length',
        status: 'warning',
        description: `Title is too long (${titleLength} characters) and may be truncated in search results`,
        currentValue: title,
        recommendation: `Shorten title to under ${TITLE_MAX_LENGTH} characters to prevent truncation`,
        priority: 'medium',
        referenceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
      });
    } else {
      issues.push({
        category: 'basic',
        checkName: 'Title Tag',
        status: 'pass',
        description: `Title tag is present and optimal length (${titleLength} characters)`,
        currentValue: title,
        recommendation: 'Title tag is well optimized',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks meta description presence and length
 */
function checkMetaDescription(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const metaDesc = crawlResult.metadata.metaDescription;

  if (!metaDesc) {
    issues.push({
      category: 'basic',
      checkName: 'Meta Description',
      status: 'fail',
      description: 'Page is missing a meta description',
      currentValue: null,
      recommendation: 'Add a compelling meta description between 120-160 characters',
      priority: 'high',
      referenceUrl: 'https://developers.google.com/search/docs/appearance/snippet',
    });
  } else {
    const descLength = metaDesc.length;

    if (descLength < META_DESC_MIN_LENGTH) {
      issues.push({
        category: 'basic',
        checkName: 'Meta Description Length',
        status: 'warning',
        description: `Meta description is too short (${descLength} characters)`,
        currentValue: metaDesc,
        recommendation: `Expand meta description to at least ${META_DESC_MIN_LENGTH} characters`,
        priority: 'medium',
        referenceUrl: 'https://developers.google.com/search/docs/appearance/snippet',
      });
    } else if (descLength > META_DESC_MAX_LENGTH) {
      issues.push({
        category: 'basic',
        checkName: 'Meta Description Length',
        status: 'warning',
        description: `Meta description is too long (${descLength} characters) and may be truncated`,
        currentValue: metaDesc,
        recommendation: `Shorten meta description to under ${META_DESC_MAX_LENGTH} characters`,
        priority: 'medium',
        referenceUrl: 'https://developers.google.com/search/docs/appearance/snippet',
      });
    } else {
      issues.push({
        category: 'basic',
        checkName: 'Meta Description',
        status: 'pass',
        description: `Meta description is present and optimal length (${descLength} characters)`,
        currentValue: metaDesc,
        recommendation: 'Meta description is well optimized',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks H1 tag presence and count
 */
function checkH1Tag(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const h1Tags = crawlResult.headings.h1;

  if (h1Tags.length === 0) {
    issues.push({
      category: 'basic',
      checkName: 'H1 Tag',
      status: 'fail',
      description: 'Page is missing an H1 heading tag',
      currentValue: null,
      recommendation: 'Add a single, descriptive H1 tag that includes your target keyword',
      priority: 'high',
      referenceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings',
    });
  } else if (h1Tags.length > 1) {
    issues.push({
      category: 'basic',
      checkName: 'H1 Tag Count',
      status: 'warning',
      description: `Page has multiple H1 tags (${h1Tags.length} found)`,
      currentValue: h1Tags.join(' | '),
      recommendation: 'Use only one H1 tag per page for clearer content hierarchy',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings',
    });
  } else {
    issues.push({
      category: 'basic',
      checkName: 'H1 Tag',
      status: 'pass',
      description: 'Page has exactly one H1 tag',
      currentValue: h1Tags[0],
      recommendation: 'H1 structure is correct',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks heading hierarchy (H1 > H2 > H3)
 */
function checkHeadingHierarchy(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const { h1, h2, h3 } = crawlResult.headings;

  // Check if H2 exists without H1
  if (h2.length > 0 && h1.length === 0) {
    issues.push({
      category: 'basic',
      checkName: 'Heading Hierarchy',
      status: 'warning',
      description: 'H2 tags found without an H1 tag',
      currentValue: `H1: ${h1.length}, H2: ${h2.length}`,
      recommendation: 'Add an H1 tag before using H2 tags for proper document structure',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings',
    });
  }

  // Check if H3 exists without H2
  if (h3.length > 0 && h2.length === 0) {
    issues.push({
      category: 'basic',
      checkName: 'Heading Hierarchy',
      status: 'warning',
      description: 'H3 tags found without H2 tags',
      currentValue: `H2: ${h2.length}, H3: ${h3.length}`,
      recommendation: 'Use H2 tags before H3 tags for proper heading hierarchy',
      priority: 'low',
      referenceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings',
    });
  }

  // If hierarchy is correct
  if (h1.length > 0 && (h2.length === 0 || h1.length > 0) && (h3.length === 0 || h2.length > 0)) {
    issues.push({
      category: 'basic',
      checkName: 'Heading Hierarchy',
      status: 'pass',
      description: 'Heading hierarchy follows proper structure',
      currentValue: `H1: ${h1.length}, H2: ${h2.length}, H3: ${h3.length}`,
      recommendation: 'Heading structure is well organized',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks canonical URL tag
 */
function checkCanonical(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const canonical = crawlResult.metadata.canonical;

  if (!canonical) {
    issues.push({
      category: 'basic',
      checkName: 'Canonical URL',
      status: 'warning',
      description: 'Page is missing a canonical URL tag',
      currentValue: null,
      recommendation: 'Add a canonical tag to prevent duplicate content issues',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
    });
  } else {
    issues.push({
      category: 'basic',
      checkName: 'Canonical URL',
      status: 'pass',
      description: 'Canonical URL tag is present',
      currentValue: canonical,
      recommendation: 'Canonical tag is properly set',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks robots meta tag
 */
function checkRobotsMeta(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const robots = crawlResult.metadata.robots;

  if (robots) {
    const robotsLower = robots.toLowerCase();
    
    if (robotsLower.includes('noindex')) {
      issues.push({
        category: 'basic',
        checkName: 'Robots Meta Tag',
        status: 'warning',
        description: 'Page has noindex directive - it will not appear in search results',
        currentValue: robots,
        recommendation: 'Remove noindex if you want this page to be indexed by search engines',
        priority: 'high',
      });
    } else if (robotsLower.includes('nofollow')) {
      issues.push({
        category: 'basic',
        checkName: 'Robots Meta Tag',
        status: 'info',
        description: 'Page has nofollow directive - links will not pass PageRank',
        currentValue: robots,
        recommendation: 'Consider if nofollow is intentional for this page',
        priority: 'low',
      });
    } else {
      issues.push({
        category: 'basic',
        checkName: 'Robots Meta Tag',
        status: 'pass',
        description: 'Robots meta tag allows indexing',
        currentValue: robots,
        recommendation: 'Robots configuration is appropriate',
        priority: 'low',
      });
    }
  } else {
    issues.push({
      category: 'basic',
      checkName: 'Robots Meta Tag',
      status: 'pass',
      description: 'No robots meta tag (defaults to index, follow)',
      currentValue: 'default (index, follow)',
      recommendation: 'Page is indexable by default',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks language declaration
 */
function checkLanguage(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const language = crawlResult.metadata.language;

  if (!language) {
    issues.push({
      category: 'basic',
      checkName: 'Language Declaration',
      status: 'warning',
      description: 'Page is missing lang attribute on html tag',
      currentValue: null,
      recommendation: 'Add lang attribute (e.g., lang="en") to help search engines understand content language',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites',
    });
  } else {
    issues.push({
      category: 'basic',
      checkName: 'Language Declaration',
      status: 'pass',
      description: 'Language is properly declared',
      currentValue: language,
      recommendation: 'Language attribute is set correctly',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks character encoding
 */
function checkCharset(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const charset = crawlResult.metadata.charset;

  if (!charset) {
    issues.push({
      category: 'basic',
      checkName: 'Character Encoding',
      status: 'warning',
      description: 'Page is missing charset declaration',
      currentValue: null,
      recommendation: 'Add <meta charset="UTF-8"> for proper character encoding',
      priority: 'medium',
    });
  } else if (charset.toLowerCase() !== 'utf-8') {
    issues.push({
      category: 'basic',
      checkName: 'Character Encoding',
      status: 'info',
      description: `Page uses ${charset} encoding instead of UTF-8`,
      currentValue: charset,
      recommendation: 'Consider using UTF-8 encoding for better compatibility',
      priority: 'low',
    });
  } else {
    issues.push({
      category: 'basic',
      checkName: 'Character Encoding',
      status: 'pass',
      description: 'Page uses UTF-8 encoding',
      currentValue: charset,
      recommendation: 'Character encoding is properly set',
      priority: 'low',
    });
  }

  return issues;
}
