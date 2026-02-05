/**
 * Intermediate SEO Analyzer
 * Checks: images, links, Open Graph, Twitter Cards, favicon, SSL
 */

import type { CrawlResult, SEOIssue } from '../types.js';

/**
 * Runs all intermediate SEO checks on the crawl result
 */
export function analyzeIntermediateSEO(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];

  issues.push(...checkImageAltTags(crawlResult));
  issues.push(...checkImageDimensions(crawlResult));
  issues.push(...checkImageLazyLoading(crawlResult));
  issues.push(...checkInternalLinks(crawlResult));
  issues.push(...checkExternalLinks(crawlResult));
  issues.push(...checkUrlStructure(crawlResult));
  issues.push(...checkOpenGraph(crawlResult));
  issues.push(...checkTwitterCard(crawlResult));
  issues.push(...checkFavicon(crawlResult));
  issues.push(...checkHttps(crawlResult));

  return issues;
}

/**
 * Checks if all images have alt attributes
 */
function checkImageAltTags(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const images = crawlResult.images;

  if (images.length === 0) {
    issues.push({
      category: 'intermediate',
      checkName: 'Image Alt Tags',
      status: 'info',
      description: 'No images found on the page',
      currentValue: '0 images',
      recommendation: 'Consider adding relevant images to enhance content',
      priority: 'low',
    });
    return issues;
  }

  const missingAlt = images.filter(img => !img.alt || img.alt.trim() === '');
  const emptyAlt = images.filter(img => img.alt === '');

  if (missingAlt.length > 0) {
    const percentage = Math.round((missingAlt.length / images.length) * 100);
    issues.push({
      category: 'intermediate',
      checkName: 'Image Alt Tags',
      status: missingAlt.length === images.length ? 'fail' : 'warning',
      description: `${missingAlt.length} of ${images.length} images (${percentage}%) are missing alt attributes`,
      currentValue: missingAlt.slice(0, 3).map(img => img.src).join(', ') + (missingAlt.length > 3 ? '...' : ''),
      recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
      priority: missingAlt.length > images.length / 2 ? 'high' : 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/appearance/google-images#use-descriptive-alt-text',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'Image Alt Tags',
      status: 'pass',
      description: `All ${images.length} images have alt attributes`,
      currentValue: `${images.length} images with alt text`,
      recommendation: 'Image accessibility is well implemented',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks if images have width and height attributes
 */
function checkImageDimensions(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const images = crawlResult.images;

  if (images.length === 0) return issues;

  const missingDimensions = images.filter(img => !img.width || !img.height);

  if (missingDimensions.length > 0) {
    issues.push({
      category: 'intermediate',
      checkName: 'Image Dimensions',
      status: 'warning',
      description: `${missingDimensions.length} images missing width/height attributes`,
      currentValue: `${missingDimensions.length} of ${images.length} images`,
      recommendation: 'Add width and height attributes to prevent layout shifts (improves CLS)',
      priority: 'medium',
      referenceUrl: 'https://web.dev/articles/optimize-cls#images-without-dimensions',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'Image Dimensions',
      status: 'pass',
      description: 'All images have width and height attributes',
      currentValue: `${images.length} images with dimensions`,
      recommendation: 'Image dimensions are properly set',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks if images use lazy loading
 */
function checkImageLazyLoading(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const images = crawlResult.images;

  if (images.length <= 2) return issues; // Lazy loading not needed for few images

  const withLazyLoading = images.filter(img => img.loading === 'lazy');

  if (withLazyLoading.length === 0) {
    issues.push({
      category: 'intermediate',
      checkName: 'Image Lazy Loading',
      status: 'info',
      description: 'No images use native lazy loading',
      currentValue: `0 of ${images.length} images`,
      recommendation: 'Add loading="lazy" to below-the-fold images for faster initial load',
      priority: 'low',
      referenceUrl: 'https://web.dev/articles/browser-level-image-lazy-loading',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'Image Lazy Loading',
      status: 'pass',
      description: `${withLazyLoading.length} images use lazy loading`,
      currentValue: `${withLazyLoading.length} of ${images.length} images`,
      recommendation: 'Lazy loading is implemented',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks internal link structure
 */
function checkInternalLinks(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const internalLinks = crawlResult.links.filter(link => link.isInternal);

  if (internalLinks.length === 0) {
    issues.push({
      category: 'intermediate',
      checkName: 'Internal Links',
      status: 'warning',
      description: 'No internal links found on the page',
      currentValue: '0 internal links',
      recommendation: 'Add internal links to improve site navigation and distribute page authority',
      priority: 'medium',
      referenceUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
    });
  } else if (internalLinks.length < 3) {
    issues.push({
      category: 'intermediate',
      checkName: 'Internal Links',
      status: 'info',
      description: `Only ${internalLinks.length} internal links found`,
      currentValue: `${internalLinks.length} internal links`,
      recommendation: 'Consider adding more internal links to improve site structure',
      priority: 'low',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'Internal Links',
      status: 'pass',
      description: `Page has ${internalLinks.length} internal links`,
      currentValue: `${internalLinks.length} internal links`,
      recommendation: 'Internal linking is adequate',
      priority: 'low',
    });
  }

  // Check for links with empty anchor text
  const emptyTextLinks = internalLinks.filter(link => !link.text.trim());
  if (emptyTextLinks.length > 0) {
    issues.push({
      category: 'intermediate',
      checkName: 'Link Anchor Text',
      status: 'warning',
      description: `${emptyTextLinks.length} links have empty anchor text`,
      currentValue: emptyTextLinks.slice(0, 3).map(l => l.href).join(', '),
      recommendation: 'Add descriptive anchor text to all links for better SEO',
      priority: 'medium',
    });
  }

  return issues;
}

/**
 * Checks external links
 */
function checkExternalLinks(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const externalLinks = crawlResult.links.filter(link => !link.isInternal);

  if (externalLinks.length > 0) {
    // Check for nofollow on external links
    const nofollowLinks = externalLinks.filter(link => link.isNoFollow);
    
    issues.push({
      category: 'intermediate',
      checkName: 'External Links',
      status: 'pass',
      description: `Page has ${externalLinks.length} external links (${nofollowLinks.length} nofollow)`,
      currentValue: `${externalLinks.length} external links`,
      recommendation: 'External links can add credibility when linking to authoritative sources',
      priority: 'low',
    });

    // Check for target="_blank" without rel="noopener"
    const unsafeLinks = externalLinks.filter(
      link => link.target === '_blank' && !link.isNoFollow
    );
    if (unsafeLinks.length > 0) {
      issues.push({
        category: 'intermediate',
        checkName: 'External Link Security',
        status: 'info',
        description: `${unsafeLinks.length} external links open in new tab`,
        currentValue: `${unsafeLinks.length} links with target="_blank"`,
        recommendation: 'Add rel="noopener noreferrer" to external links with target="_blank"',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks URL structure
 */
function checkUrlStructure(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const url = crawlResult.url;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Check for URL length
    if (pathname.length > 75) {
      issues.push({
        category: 'intermediate',
        checkName: 'URL Length',
        status: 'warning',
        description: `URL path is too long (${pathname.length} characters)`,
        currentValue: pathname,
        recommendation: 'Keep URL paths under 75 characters for better usability',
        priority: 'low',
      });
    }

    // Check for underscores in URL
    if (pathname.includes('_')) {
      issues.push({
        category: 'intermediate',
        checkName: 'URL Structure',
        status: 'info',
        description: 'URL contains underscores',
        currentValue: pathname,
        recommendation: 'Use hyphens (-) instead of underscores (_) in URLs',
        priority: 'low',
        referenceUrl: 'https://developers.google.com/search/docs/crawling-indexing/url-structure',
      });
    }

    // Check for uppercase characters
    if (/[A-Z]/.test(pathname)) {
      issues.push({
        category: 'intermediate',
        checkName: 'URL Case',
        status: 'info',
        description: 'URL contains uppercase characters',
        currentValue: pathname,
        recommendation: 'Use lowercase URLs for consistency',
        priority: 'low',
      });
    }

    // Check for special characters
    if (/[^a-zA-Z0-9\-_\/\.]/.test(pathname)) {
      issues.push({
        category: 'intermediate',
        checkName: 'URL Characters',
        status: 'warning',
        description: 'URL contains special characters',
        currentValue: pathname,
        recommendation: 'Use only alphanumeric characters and hyphens in URLs',
        priority: 'low',
      });
    }

    // If URL structure is clean
    if (!pathname.includes('_') && !/[A-Z]/.test(pathname) && pathname.length <= 75) {
      issues.push({
        category: 'intermediate',
        checkName: 'URL Structure',
        status: 'pass',
        description: 'URL structure follows SEO best practices',
        currentValue: pathname,
        recommendation: 'URL is well structured',
        priority: 'low',
      });
    }
  } catch {
    issues.push({
      category: 'intermediate',
      checkName: 'URL Structure',
      status: 'fail',
      description: 'Invalid URL format',
      currentValue: url,
      recommendation: 'Ensure URL is properly formatted',
      priority: 'high',
    });
  }

  return issues;
}

/**
 * Checks Open Graph tags
 */
function checkOpenGraph(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const og = crawlResult.openGraph;

  const missingTags: string[] = [];
  if (!og.title) missingTags.push('og:title');
  if (!og.description) missingTags.push('og:description');
  if (!og.image) missingTags.push('og:image');
  if (!og.url) missingTags.push('og:url');

  if (missingTags.length === 4) {
    issues.push({
      category: 'intermediate',
      checkName: 'Open Graph Tags',
      status: 'warning',
      description: 'Page has no Open Graph meta tags',
      currentValue: null,
      recommendation: 'Add Open Graph tags for better social media sharing',
      priority: 'medium',
      referenceUrl: 'https://ogp.me/',
    });
  } else if (missingTags.length > 0) {
    issues.push({
      category: 'intermediate',
      checkName: 'Open Graph Tags',
      status: 'warning',
      description: `Missing Open Graph tags: ${missingTags.join(', ')}`,
      currentValue: `Present: og:title=${!!og.title}, og:description=${!!og.description}, og:image=${!!og.image}`,
      recommendation: `Add missing tags: ${missingTags.join(', ')}`,
      priority: 'low',
      referenceUrl: 'https://ogp.me/',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'Open Graph Tags',
      status: 'pass',
      description: 'All essential Open Graph tags are present',
      currentValue: `og:title, og:description, og:image, og:url`,
      recommendation: 'Social sharing optimization is complete',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks Twitter Card tags
 */
function checkTwitterCard(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const twitter = crawlResult.twitterCard;

  if (!twitter.card) {
    issues.push({
      category: 'intermediate',
      checkName: 'Twitter Card',
      status: 'info',
      description: 'Page has no Twitter Card meta tags',
      currentValue: null,
      recommendation: 'Add Twitter Card tags for better Twitter sharing',
      priority: 'low',
      referenceUrl: 'https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards',
    });
  } else {
    const missingTags: string[] = [];
    if (!twitter.title) missingTags.push('twitter:title');
    if (!twitter.description) missingTags.push('twitter:description');
    if (!twitter.image) missingTags.push('twitter:image');

    if (missingTags.length > 0) {
      issues.push({
        category: 'intermediate',
        checkName: 'Twitter Card',
        status: 'warning',
        description: `Twitter Card present but missing: ${missingTags.join(', ')}`,
        currentValue: `Card type: ${twitter.card}`,
        recommendation: `Add missing tags: ${missingTags.join(', ')}`,
        priority: 'low',
      });
    } else {
      issues.push({
        category: 'intermediate',
        checkName: 'Twitter Card',
        status: 'pass',
        description: 'Twitter Card is fully configured',
        currentValue: `Card type: ${twitter.card}`,
        recommendation: 'Twitter sharing optimization is complete',
        priority: 'low',
      });
    }
  }

  return issues;
}

/**
 * Checks for favicon
 */
function checkFavicon(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];

  if (!crawlResult.favicon) {
    issues.push({
      category: 'intermediate',
      checkName: 'Favicon',
      status: 'warning',
      description: 'Page is missing a favicon',
      currentValue: null,
      recommendation: 'Add a favicon for brand recognition in browser tabs and bookmarks',
      priority: 'low',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'Favicon',
      status: 'pass',
      description: 'Favicon is present',
      currentValue: crawlResult.favicon,
      recommendation: 'Favicon is properly configured',
      priority: 'low',
    });
  }

  return issues;
}

/**
 * Checks HTTPS usage
 */
function checkHttps(crawlResult: CrawlResult): SEOIssue[] {
  const issues: SEOIssue[] = [];

  if (!crawlResult.isHttps) {
    issues.push({
      category: 'intermediate',
      checkName: 'HTTPS',
      status: 'fail',
      description: 'Page is not served over HTTPS',
      currentValue: crawlResult.url,
      recommendation: 'Enable HTTPS for security and SEO ranking benefits',
      priority: 'high',
      referenceUrl: 'https://developers.google.com/search/docs/advanced/security/https',
    });
  } else {
    issues.push({
      category: 'intermediate',
      checkName: 'HTTPS',
      status: 'pass',
      description: 'Page is served over HTTPS',
      currentValue: crawlResult.url,
      recommendation: 'Security is properly configured',
      priority: 'low',
    });
  }

  return issues;
}
