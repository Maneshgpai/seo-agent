/**
 * SEO Agent Type Definitions
 * Defines all interfaces used throughout the SEO analysis system
 */

// Analysis depth levels
export type AnalysisDepth = 'basic' | 'intermediate' | 'advanced' | 'all';

// Priority levels for issues
export type Priority = 'high' | 'medium' | 'low';

// Category of SEO check
export type Category = 'basic' | 'intermediate' | 'advanced';

// Status of individual check
export type CheckStatus = 'pass' | 'fail' | 'warning' | 'info';

/**
 * Individual SEO issue found during analysis
 */
export interface SEOIssue {
  category: Category;
  checkName: string;
  status: CheckStatus;
  description: string;
  currentValue: string | null;
  recommendation: string;
  priority: Priority;
  referenceUrl?: string;
}

/**
 * Metadata extracted from a webpage
 */
export interface PageMetadata {
  url: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  language: string | null;
  charset: string | null;
}

/**
 * Heading structure of a page
 */
export interface HeadingStructure {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

/**
 * Image analysis data
 */
export interface ImageData {
  src: string;
  alt: string | null;
  width: string | null;
  height: string | null;
  loading: string | null;
}

/**
 * Link analysis data
 */
export interface LinkData {
  href: string;
  text: string;
  isInternal: boolean;
  isNoFollow: boolean;
  target: string | null;
}

/**
 * Open Graph metadata
 */
export interface OpenGraphData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
  type: string | null;
  siteName: string | null;
}

/**
 * Twitter Card metadata
 */
export interface TwitterCardData {
  card: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
}

/**
 * Structured data (JSON-LD) found on page
 */
export interface StructuredData {
  type: string;
  raw: object;
}

/**
 * Complete crawl result from a webpage
 */
export interface CrawlResult {
  url: string;
  statusCode: number;
  html: string;
  loadTime: number;
  isHttps: boolean;
  contentLength: number;
  metadata: PageMetadata;
  headings: HeadingStructure;
  images: ImageData[];
  links: LinkData[];
  openGraph: OpenGraphData;
  twitterCard: TwitterCardData;
  structuredData: StructuredData[];
  viewport: string | null;
  favicon: string | null;
  hreflang: { lang: string; href: string }[];
  hasAmp: boolean;
  renderBlockingResources: string[];
}

/**
 * Analysis configuration options
 */
export interface AnalysisOptions {
  url: string;
  depth: AnalysisDepth;
  timeout?: number;
  userAgent?: string;
  checkSitemap?: boolean;
  checkRobotsTxt?: boolean;
}

/**
 * Score breakdown by category
 */
export interface ScoreBreakdown {
  basic: number;
  intermediate: number;
  advanced: number;
  overall: number;
}

/** SSL and mixed content verification result (report-only, not logged) */
export interface SslSecurityCheck {
  sslValid: boolean;
  sslError?: string;
  mixedContent: { hasMixedContent: boolean; insecureUrls: string[] };
}

/**
 * Complete SEO analysis report
 */
export interface SEOReport {
  url: string;
  analyzedAt: string;
  depth: AnalysisDepth;
  scores: ScoreBreakdown;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  issues: SEOIssue[];
  metadata: PageMetadata;
  recommendations: {
    critical: string[];
    important: string[];
    suggestions: string[];
  };
  pageSpeed?: PageSpeedData;
  /** Real-user Core Web Vitals from Chrome UX Report (CrUX) when API key is set */
  crux?: CruxData;
  /** SSL certificate validity and mixed content check (report-only) */
  sslSecurity?: SslSecurityCheck;
  /** When CrUX data is not available: reason and when it would become available (PDF report only) */
  cruxUnavailableReason?: string;
  cruxWhenAvailable?: string;
}

// Rating type for Core Web Vitals metrics
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Individual Core Web Vital metric with value and rating
 */
export interface CoreWebVitalMetric {
  value: number;
  rating: MetricRating;
  displayValue: string;
}

/**
 * Core Web Vitals metrics from PageSpeed Insights
 * - LCP (Largest Contentful Paint): Loading performance
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FID (First Input Delay): Interactivity (legacy, being replaced by INP)
 * - INP (Interaction to Next Paint): Interactivity (newer metric)
 * - TTFB (Time to First Byte): Server response time
 */
export interface CoreWebVitals {
  lcp: CoreWebVitalMetric | null;
  cls: CoreWebVitalMetric | null;
  fid: CoreWebVitalMetric | null;
  inp: CoreWebVitalMetric | null;
  ttfb: CoreWebVitalMetric | null;
}

/**
 * Lighthouse category scores (0-100)
 */
export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

/**
 * Individual audit result from Lighthouse
 */
export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue?: string;
  numericValue?: number;
}

/**
 * Complete PageSpeed Insights data
 */
export interface PageSpeedData {
  url: string;
  strategy: 'mobile' | 'desktop';
  fetchedAt: string;
  coreWebVitals: CoreWebVitals;
  lighthouseScores: LighthouseScores;
  audits: LighthouseAudit[];
}

/** CrUX 28-day collection window (year/month/day) */
export interface CruxCollectionPeriod {
  firstDate: { year: number; month: number; day: number };
  lastDate: { year: number; month: number; day: number };
}

/**
 * Real-user Core Web Vitals from Chrome UX Report (CrUX) API.
 * Same metric shape as lab data for consistent display; source is field data.
 */
export interface CruxData {
  /** Origin when query was by origin (site-level aggregate) */
  origin?: string;
  /** Page URL when query was by URL */
  url?: string;
  formFactor?: 'PHONE' | 'TABLET' | 'DESKTOP';
  collectionPeriod: CruxCollectionPeriod;
  /** CWV metrics derived from CrUX p75; reuses CoreWebVitalMetric for display */
  coreWebVitals: {
    lcp: CoreWebVitalMetric | null;
    cls: CoreWebVitalMetric | null;
    fcp: CoreWebVitalMetric | null;
    inp: CoreWebVitalMetric | null;
    ttfb: CoreWebVitalMetric | null;
  };
}
